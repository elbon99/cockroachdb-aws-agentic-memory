import { randomUUID } from "node:crypto";

import { embedReceiptText } from "@/lib/aws/embedding";
import { cosineDistance } from "@/lib/domain/embedding";
import { sha256 } from "@/lib/domain/hash";
import type { ObserveInput, ProposeInput, ReceiptStore } from "@/lib/receipts/store";
import type {
  ActionReceipt,
  MemoryClaim,
  MemoryReview,
  ObservationFragment,
  RecallItem,
  RecallResult,
  ReceiptSnapshot,
  ToolObservation,
} from "@/lib/receipts/types";

const SOURCES = [
  { id: "policy", kind: "http" as const, label: "Refund policy", locator: "github:demo-source/policy.json", freshnessSeconds: 60, currentObservationId: null },
  { id: "order", kind: "sql" as const, label: "Order facts", locator: "query:get_order", freshnessSeconds: 30, currentObservationId: null },
  { id: "local-runbook", kind: "file" as const, label: "Local runbook", locator: "demo/runbook.json", freshnessSeconds: 0, currentObservationId: null },
];

function canonical(value: unknown): string {
  if (typeof value === "string") return value;
  return JSON.stringify(value, Object.keys((value ?? {}) as object).sort());
}

export class InMemoryReceiptStore implements ReceiptStore {
  readonly mode = "local-demo" as const;
  private state: ReceiptSnapshot = this.empty();
  private tail: Promise<void> = Promise.resolve();

  async reset(): Promise<void> {
    await this.tx(() => { this.state = this.empty(); });
  }

  async snapshot(): Promise<ReceiptSnapshot> {
    return structuredClone(this.state);
  }

  async observe(input: ObserveInput): Promise<{ observationId: string; changed: boolean }> {
    return this.tx(() => {
      const source = this.state.sources.find((item) => item.id === input.sourceId);
      if (!source) throw new Error(`Unregistered source: ${input.sourceId}`);
      const now = new Date().toISOString();
      const previousObservationId = source.currentObservationId;
      const previousFragments = previousObservationId
        ? this.state.fragments.filter((item) => item.observationId === previousObservationId)
        : [];
      const observation: ToolObservation = {
        id: randomUUID(), sourceId: source.id, toolName: input.toolName,
        request: input.request, responseHash: sha256(canonical(input.response)),
        sourceVersion: input.sourceVersion, observedAt: now,
        expiresAt: source.freshnessSeconds > 0 ? new Date(Date.now() + source.freshnessSeconds * 1000).toISOString() : null,
        runId: input.runId, step: input.step,
      };
      const fragments = input.fragments.map<ObservationFragment>((item) => {
        const value = canonical(item.value);
        return { id: randomUUID(), observationId: observation.id, selector: item.selector, value, valueHash: sha256(value) };
      });
      this.state.observations.push(observation);
      this.state.fragments.push(...fragments);
      source.currentObservationId = observation.id;

      let changed = false;
      const changedSelectors = new Map<string, string>();
      for (const oldFragment of previousFragments) {
        const replacement = fragments.find((item) => item.selector === oldFragment.selector);
        if (!replacement || replacement.valueHash !== oldFragment.valueHash) {
          changed = true;
          changedSelectors.set(oldFragment.selector, replacement?.valueHash ?? "");
        }
      }
      for (const [selector, currentHash] of changedSelectors) {
        const historicalIds = new Set(this.state.fragments
          .filter((fragment) => {
            const observation = this.state.observations.find((item) => item.id === fragment.observationId);
            return observation?.sourceId === source.id && fragment.selector === selector && fragment.valueHash !== currentHash;
          })
          .map((fragment) => fragment.id));
        for (const dependency of this.state.dependencies.filter((item) => historicalIds.has(item.fragmentId) && item.required)) {
            const memory = this.state.memories.find((item) => item.id === dependency.memoryId);
            if (memory?.status === "valid") {
              memory.status = "stale";
              memory.invalidatedAt = now;
              memory.invalidationReason = `${source.label} ${selector} changed`;
            }
        }
      }
      return { observationId: observation.id, changed };
    });
  }

  async propose(input: ProposeInput): Promise<MemoryClaim> {
    return this.tx(async () => {
      if (input.fragmentIds.length === 0) throw new Error("A memory requires at least one exact receipt fragment");
      for (const id of input.fragmentIds) if (!this.state.fragments.some((item) => item.id === id)) throw new Error(`Unknown fragment ${id}`);
      const embedding = await embedReceiptText(input.statement);
      const memory: MemoryClaim = {
        id: randomUUID(), statement: input.statement, status: "proposed", proposedBy: input.proposedBy,
        rationale: input.rationale, embedding, reviewedAt: null,
        invalidatedAt: null, invalidationReason: null,
      };
      this.state.memories.push(memory);
      this.state.dependencies.push(...input.fragmentIds.map((fragmentId) => ({ memoryId: memory.id, fragmentId, required: true })));
      return structuredClone(memory);
    });
  }

  async review(memoryId: string, decision: MemoryReview["decision"], reason: string): Promise<MemoryReview> {
    return this.tx(() => {
      const memory = this.state.memories.find((item) => item.id === memoryId);
      if (!memory || memory.status !== "proposed") throw new Error("Only proposed memories can be reviewed");
      const review: MemoryReview = { id: randomUUID(), memoryId, decision, reviewer: "demo-human", reason, createdAt: new Date().toISOString() };
      memory.status = decision === "approved" ? "valid" : "rejected";
      memory.reviewedAt = review.createdAt;
      this.state.reviews.push(review);
      return structuredClone(review);
    });
  }

  async recall(query: string, limit = 5): Promise<RecallResult> {
    const q = await embedReceiptText(query);
    const items = this.state.memories.map<RecallItem>((memory) => ({
      memory: structuredClone(memory), distance: cosineDistance(q, memory.embedding),
      dependencies: this.state.dependencies.filter((item) => item.memoryId === memory.id).map((dependency) => {
        const fragment = this.state.fragments.find((item) => item.id === dependency.fragmentId)!;
        const observation = this.state.observations.find((item) => item.id === fragment.observationId)!;
        const source = this.state.sources.find((item) => item.id === observation.sourceId)!;
        const currentObservation = this.state.observations.find((item) => item.id === source.currentObservationId);
        const currentFragment = this.state.fragments.find((item) => item.observationId === source.currentObservationId && item.selector === fragment.selector) ?? null;
        const withinTtl = !currentObservation?.expiresAt || Date.parse(currentObservation.expiresAt) > Date.now();
        return { dependency: structuredClone(dependency), fragment: structuredClone(fragment), currentFragment: currentFragment ? structuredClone(currentFragment) : null, fresh: currentFragment?.valueHash === fragment.valueHash && withinTtl };
      }),
    })).sort((a, b) => a.distance - b.distance);
    const eligible = (item: RecallItem) => item.memory.status === "valid" && item.dependencies.every((dep) => !dep.dependency.required || dep.fresh);
    return { query, admitted: items.filter(eligible).slice(0, limit), withheld: items.filter((item) => !eligible(item)).slice(0, limit) };
  }

  async act(action: ActionReceipt["action"]): Promise<ActionReceipt> {
    return this.tx(async () => {
      const recall = await this.recall("damaged order 14 days refund eligibility", 10);
      const memory = recall.admitted.find((item) => action === "issue_refund"
        ? item.memory.statement.includes("eligible") && !item.memory.statement.includes("ineligible")
        : item.memory.statement.includes("ineligible"));
      const receipt: ActionReceipt = {
        id: randomUUID(), action, outcome: memory ? "executed" : "blocked", memoryId: memory?.memory.id ?? null,
        reason: memory ? "Approved, current memory supports this action" : "No approved current memory supports this action",
        createdAt: new Date().toISOString(),
      };
      this.state.actions.push(receipt);
      return structuredClone(receipt);
    });
  }

  private empty(): ReceiptSnapshot {
    return { mode: this.mode, sources: structuredClone(SOURCES), observations: [], fragments: [], memories: [], dependencies: [], reviews: [], actions: [] };
  }

  private async tx<T>(fn: () => T | Promise<T>): Promise<T> {
    const previous = this.tail;
    let release!: () => void;
    this.tail = new Promise((resolve) => { release = resolve; });
    await previous;
    try { return await fn(); } finally { release(); }
  }
}
