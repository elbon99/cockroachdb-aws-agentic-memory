import { randomUUID } from "node:crypto";
import { Pool, type PoolClient } from "pg";

import { embedReceiptText } from "@/lib/aws/embedding";
import { sha256 } from "@/lib/domain/hash";
import { toVectorLiteral } from "@/lib/domain/embedding";
import type { ObserveInput, ProposeInput, ReceiptStore } from "@/lib/receipts/store";
import type { ActionReceipt, MemoryClaim, MemoryReview, ObservationFragment, RecallItem, RecallResult, ReceiptSnapshot, ToolObservation, ToolSource } from "@/lib/receipts/types";

const TENANT = "tenant-public-demo";
const SOURCE_SEED: ToolSource[] = [
  { id: "policy", kind: "http", label: "Refund policy", locator: "github:demo-source/policy.json", freshnessSeconds: 60, currentObservationId: null },
  { id: "order", kind: "sql", label: "Order facts", locator: "query:get_order", freshnessSeconds: 30, currentObservationId: null },
  { id: "local-runbook", kind: "file", label: "Local runbook", locator: "demo/runbook.json", freshnessSeconds: 0, currentObservationId: null },
];

const canonical = (value: unknown) => typeof value === "string" ? value : JSON.stringify(value);
const date = (value: unknown) => value ? new Date(value as string).toISOString() : null;

export class CockroachReceiptStore implements ReceiptStore {
  readonly mode = "cockroachdb" as const;
  private readonly pool: Pool;

  constructor(url: string) { this.pool = new Pool({ connectionString: url, max: 8, application_name: "contextseal-receipts" }); }

  async reset(): Promise<void> {
    await this.transaction(async (client) => {
      await client.query("DELETE FROM action_receipts WHERE tenant_id = $1", [TENANT]);
      await client.query("DELETE FROM memory_reviews WHERE tenant_id = $1", [TENANT]);
      await client.query("DELETE FROM memory_receipt_dependencies WHERE memory_id IN (SELECT id FROM receipt_memories WHERE tenant_id = $1)", [TENANT]);
      await client.query("DELETE FROM receipt_memories WHERE tenant_id = $1", [TENANT]);
      await client.query("DELETE FROM observation_fragments WHERE observation_id IN (SELECT id FROM tool_observations WHERE tenant_id = $1)", [TENANT]);
      await client.query("DELETE FROM tool_observations WHERE tenant_id = $1", [TENANT]);
      await client.query("DELETE FROM receipt_sources WHERE tenant_id = $1", [TENANT]);
      for (const source of SOURCE_SEED) await client.query(
        "INSERT INTO receipt_sources (id, tenant_id, kind, label, locator, freshness_seconds) VALUES ($1,$2,$3,$4,$5,$6)",
        [source.id, TENANT, source.kind, source.label, source.locator, source.freshnessSeconds],
      );
    });
  }

  async snapshot(): Promise<ReceiptSnapshot> {
    const [sources, observations, fragments, memories, dependencies, reviews, actions] = await Promise.all([
      this.pool.query("SELECT * FROM receipt_sources WHERE tenant_id=$1 ORDER BY id", [TENANT]),
      this.pool.query("SELECT * FROM tool_observations WHERE tenant_id=$1 ORDER BY observed_at,id", [TENANT]),
      this.pool.query("SELECT f.* FROM observation_fragments f JOIN tool_observations o ON o.id=f.observation_id WHERE o.tenant_id=$1 ORDER BY o.observed_at,f.selector", [TENANT]),
      this.pool.query("SELECT *, embedding::STRING AS embedding_text FROM receipt_memories WHERE tenant_id=$1 ORDER BY created_at,id", [TENANT]),
      this.pool.query("SELECT d.* FROM memory_receipt_dependencies d JOIN receipt_memories m ON m.id=d.memory_id WHERE m.tenant_id=$1", [TENANT]),
      this.pool.query("SELECT * FROM memory_reviews WHERE tenant_id=$1 ORDER BY created_at", [TENANT]),
      this.pool.query("SELECT * FROM action_receipts WHERE tenant_id=$1 ORDER BY created_at", [TENANT]),
    ]);
    return {
      mode: this.mode,
      sources: sources.rows.map((r) => ({ id:r.id, kind:r.kind, label:r.label, locator:r.locator, freshnessSeconds:Number(r.freshness_seconds), currentObservationId:r.current_observation_id })),
      observations: observations.rows.map(this.mapObservation),
      fragments: fragments.rows.map((r) => ({ id:r.id, observationId:r.observation_id, selector:r.selector, value:r.value, valueHash:r.value_hash })),
      memories: memories.rows.map(this.mapMemory),
      dependencies: dependencies.rows.map((r) => ({ memoryId:r.memory_id, fragmentId:r.fragment_id, required:r.required })),
      reviews: reviews.rows.map((r) => ({ id:r.id, memoryId:r.memory_id, decision:r.decision, reviewer:r.reviewer, reason:r.reason, createdAt:date(r.created_at)! })),
      actions: actions.rows.map((r) => ({ id:r.id, action:r.action, outcome:r.outcome, memoryId:r.memory_id, reason:r.reason, createdAt:date(r.created_at)! })),
    };
  }

  async observe(input: ObserveInput): Promise<{ observationId: string; changed: boolean }> {
    return this.transaction(async (client) => {
      const sourceResult = await client.query("SELECT * FROM receipt_sources WHERE tenant_id=$1 AND id=$2 FOR UPDATE", [TENANT,input.sourceId]);
      const source = sourceResult.rows[0]; if (!source) throw new Error(`Unregistered source: ${input.sourceId}`);
      const id = randomUUID(); const now = new Date();
      const expires = Number(source.freshness_seconds) > 0 ? new Date(now.getTime()+Number(source.freshness_seconds)*1000) : null;
      await client.query("INSERT INTO tool_observations (id,tenant_id,source_id,tool_name,request,response_hash,source_version,observed_at,expires_at,run_id,step) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)", [id,TENANT,input.sourceId,input.toolName,JSON.stringify(input.request),sha256(canonical(input.response)),input.sourceVersion,now,expires,input.runId,input.step]);
      const old = source.current_observation_id ? await client.query("SELECT id,selector,value_hash FROM observation_fragments WHERE observation_id=$1",[source.current_observation_id]) : { rows: [] };
      const newBySelector = new Map<string,string>();
      for (const item of input.fragments) { const value=canonical(item.value); const hash=sha256(value); newBySelector.set(item.selector,hash); await client.query("INSERT INTO observation_fragments (observation_id,selector,value,value_hash) VALUES ($1,$2,$3,$4)",[id,item.selector,value,hash]); }
      const changedSelectors = old.rows.filter((r) => newBySelector.get(r.selector)!==r.value_hash).map((r)=>r.selector as string);
      const changedIds:string[]=[];
      for(const selector of changedSelectors){
        const historical=await client.query("SELECT f.id FROM observation_fragments f JOIN tool_observations o ON o.id=f.observation_id WHERE o.tenant_id=$1 AND o.source_id=$2 AND f.selector=$3 AND f.value_hash<>$4",[TENANT,input.sourceId,selector,newBySelector.get(selector)??""]);
        changedIds.push(...historical.rows.map((r)=>r.id as string));
      }
      if (changedIds.length) await client.query("UPDATE receipt_memories SET status='stale',invalidated_at=now(),invalidation_reason=$2 WHERE status='valid' AND id IN (SELECT memory_id FROM memory_receipt_dependencies WHERE required AND fragment_id=ANY($1::UUID[]))",[changedIds,`${source.label} selected evidence changed`]);
      await client.query("UPDATE receipt_sources SET current_observation_id=$1 WHERE tenant_id=$2 AND id=$3",[id,TENANT,input.sourceId]);
      return { observationId:id, changed:changedSelectors.length>0 };
    });
  }

  async propose(input: ProposeInput): Promise<MemoryClaim> {
    const embedding = await embedReceiptText(input.statement); const id=randomUUID();
    await this.transaction(async (client) => {
      const found=await client.query("SELECT count(*)::INT AS n FROM observation_fragments WHERE id=ANY($1::UUID[])",[input.fragmentIds]);
      if (Number(found.rows[0].n)!==input.fragmentIds.length || input.fragmentIds.length===0) throw new Error("Memory evidence is missing");
      await client.query("INSERT INTO receipt_memories (id,tenant_id,statement,status,proposed_by,rationale,embedding) VALUES ($1,$2,$3,'proposed',$4,$5,$6::VECTOR)",[id,TENANT,input.statement,input.proposedBy,input.rationale,toVectorLiteral(embedding)]);
      for (const fragmentId of input.fragmentIds) await client.query("INSERT INTO memory_receipt_dependencies (memory_id,fragment_id,required) VALUES ($1,$2,true)",[id,fragmentId]);
    });
    return (await this.snapshot()).memories.find((m)=>m.id===id)!;
  }

  async review(memoryId: string, decision: MemoryReview["decision"], reason: string): Promise<MemoryReview> {
    const id=randomUUID();
    await this.transaction(async (client)=>{
      const result=await client.query("UPDATE receipt_memories SET status=$1,reviewed_at=now() WHERE tenant_id=$2 AND id=$3 AND status='proposed' RETURNING id",[decision==="approved"?"valid":"rejected",TENANT,memoryId]);
      if (!result.rowCount) throw new Error("Only proposed memories can be reviewed");
      await client.query("INSERT INTO memory_reviews (id,tenant_id,memory_id,decision,reviewer,reason) VALUES ($1,$2,$3,$4,'demo-human',$5)",[id,TENANT,memoryId,decision,reason]);
    });
    return (await this.snapshot()).reviews.find((r)=>r.id===id)!;
  }

  async recall(query: string, limit=5): Promise<RecallResult> {
    const vector=toVectorLiteral(await embedReceiptText(query));
    const result=await this.pool.query("SELECT *,embedding::STRING AS embedding_text,(embedding <-> $2::VECTOR) AS distance FROM receipt_memories WHERE tenant_id=$1 ORDER BY embedding <-> $2::VECTOR LIMIT $3",[TENANT,vector,Math.max(limit*4,20)]);
    const snapshot=await this.snapshot();
    const items=result.rows.map<RecallItem>((r)=>{
      const memory=this.mapMemory(r); const deps=snapshot.dependencies.filter((d)=>d.memoryId===memory.id).map((dependency)=>{
        const fragment=snapshot.fragments.find((f)=>f.id===dependency.fragmentId)!; const obs=snapshot.observations.find((o)=>o.id===fragment.observationId)!; const source=snapshot.sources.find((s)=>s.id===obs.sourceId)!; const currentObservation=snapshot.observations.find((o)=>o.id===source.currentObservationId);
        const currentFragment=snapshot.fragments.find((f)=>f.observationId===source.currentObservationId&&f.selector===fragment.selector)??null;
        const withinTtl=!currentObservation?.expiresAt||Date.parse(currentObservation.expiresAt)>Date.now();
        return {dependency,fragment,currentFragment,fresh:currentFragment?.valueHash===fragment.valueHash&&withinTtl};
      }); return {memory,distance:Number(r.distance),dependencies:deps};
    });
    const eligible=(i:RecallItem)=>i.memory.status==="valid"&&i.dependencies.every((d)=>!d.dependency.required||d.fresh);
    return {query,admitted:items.filter(eligible).slice(0,limit),withheld:items.filter((i)=>!eligible(i)).slice(0,limit)};
  }

  async act(action: ActionReceipt["action"]): Promise<ActionReceipt> {
    const recall=await this.recall("damaged order 14 days refund eligibility",10);
    const item=recall.admitted.find((i)=>action==="issue_refund"?i.memory.statement.includes("eligible")&&!i.memory.statement.includes("ineligible"):i.memory.statement.includes("ineligible"));
    const id=randomUUID(), outcome=item?"executed":"blocked", reason=item?"Approved, current memory supports this action":"No approved current memory supports this action";
    await this.pool.query("INSERT INTO action_receipts (id,tenant_id,action,outcome,memory_id,reason) VALUES ($1,$2,$3,$4,$5,$6)",[id,TENANT,action,outcome,item?.memory.id??null,reason]);
    return {id,action,outcome,memoryId:item?.memory.id??null,reason,createdAt:new Date().toISOString()};
  }

  private mapObservation=(r:Record<string,unknown>):ToolObservation=>({id:r.id as string,sourceId:r.source_id as string,toolName:r.tool_name as string,request:r.request as Record<string,unknown>,responseHash:r.response_hash as string,sourceVersion:r.source_version as string,observedAt:date(r.observed_at)!,expiresAt:date(r.expires_at),runId:r.run_id as string,step:Number(r.step)});
  private mapMemory=(r:Record<string,unknown>):MemoryClaim=>({id:r.id as string,statement:r.statement as string,status:r.status as MemoryClaim["status"],proposedBy:r.proposed_by as MemoryClaim["proposedBy"],rationale:r.rationale as string,embedding:(r.embedding_text as string).slice(1,-1).split(",").map(Number),reviewedAt:date(r.reviewed_at),invalidatedAt:date(r.invalidated_at),invalidationReason:r.invalidation_reason as string|null});

  private async transaction<T>(fn:(client:PoolClient)=>Promise<T>):Promise<T>{
    for(let attempt=0;attempt<4;attempt++){const client=await this.pool.connect();try{await client.query("BEGIN");await client.query("SET TRANSACTION ISOLATION LEVEL SERIALIZABLE");const result=await fn(client);await client.query("COMMIT");return result;}catch(error){await client.query("ROLLBACK");if((error as {code?:string}).code!=="40001"||attempt===3)throw error;}finally{client.release();}}
    throw new Error("Serializable transaction retry budget exhausted");
  }
}
