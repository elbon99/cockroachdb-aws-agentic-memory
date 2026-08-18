import { Pool } from "pg";

import { sha256 } from "@/lib/domain/hash";

export interface AdapterObservation {
  response: unknown;
  sourceVersion: string;
  fragments: Array<{ selector: string; value: unknown }>;
}

function jsonPointer(value: unknown, pointer: string): unknown {
  if (pointer === "") return value;
  return pointer.slice(1).split("/").map((part) => part.replaceAll("~1", "/").replaceAll("~0", "~"))
    .reduce<unknown>((current, part) => {
      if (!current || typeof current !== "object" || !(part in current)) throw new Error(`Selector ${pointer} was not found`);
      return (current as Record<string, unknown>)[part];
    }, value);
}

/** GitHub Contents is the only HTTP surface: registered repo/path, GET-only, bounded, timed out. */
export async function observeGitHubContents(selectors: string[]): Promise<AdapterObservation> {
  const owner = process.env.DEMO_GITHUB_OWNER?.trim();
  const repo = process.env.DEMO_GITHUB_REPO?.trim();
  const path = process.env.DEMO_GITHUB_POLICY_PATH?.trim() || "demo/policy.json";
  const ref = process.env.DEMO_GITHUB_REF?.trim() || "demo-source";
  if (!owner || !repo || !/^[\w.-]+$/.test(owner) || !/^[\w.-]+$/.test(repo)) throw new Error("Registered GitHub demo source is not configured");
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path.split("/").map(encodeURIComponent).join("/")}?ref=${encodeURIComponent(ref)}`;
  const response = await fetch(url, { headers: { accept:"application/vnd.github.raw+json", "user-agent":"contextseal-demo" }, redirect:"error", signal:AbortSignal.timeout(5_000) });
  if (!response.ok) throw new Error(`GitHub source returned ${response.status}`);
  const content = await response.text();
  if (Buffer.byteLength(content) > 1_000_000) throw new Error("HTTP observation exceeds 1 MB");
  const parsed = JSON.parse(content) as unknown;
  return { response: parsed, sourceVersion: response.headers.get("etag") || sha256(content), fragments: selectors.map((selector) => ({ selector, value: jsonPointer(parsed, selector) })) };
}

/** Only a named, parameterized, read-only query can run; callers cannot submit SQL. */
export async function observeOrder(orderId: string): Promise<AdapterObservation> {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) return { response:{ order_id:orderId, age_days:14, damaged:true, evidence_verified:true }, sourceVersion:"local-order-fixture-v1", fragments:[{selector:"/age_days",value:14},{selector:"/damaged",value:true},{selector:"/evidence_verified",value:true}] };
  const pool = new Pool({ connectionString:url, max:1, application_name:"contextseal-sql-observer" });
  try {
    const result = await pool.query("SELECT order_id, age_days, damaged, evidence_verified, updated_at FROM demo_orders WHERE order_id=$1 ORDER BY order_id LIMIT 1", [orderId]);
    if (!result.rows[0]) throw new Error("Order was not found");
    const row=result.rows[0];
    return { response:row, sourceVersion:new Date(row.updated_at).toISOString(), fragments:[{selector:"/age_days",value:Number(row.age_days)},{selector:"/damaged",value:row.damaged},{selector:"/evidence_verified",value:row.evidence_verified}] };
  } finally { await pool.end(); }
}
