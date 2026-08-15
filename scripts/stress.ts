import {
  createMemoryGraphSeed,
  GRAPH_POLICY_PATH,
  GRAPH_REPOSITORY_ID,
  GRAPH_TENANT_ID,
} from "../src/lib/memory-graph/fixtures";
import { CockroachGraphStore } from "../src/lib/memory-graph/cockroach-store";

try { process.loadEnvFile(".env.local"); } catch { /* Environment variables may be injected. */ }

const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) throw new Error("DATABASE_URL is required");

const store = new CockroachGraphStore(databaseUrl);
await store.reset(createMemoryGraphSeed());
const snapshot = await store.snapshot(GRAPH_REPOSITORY_ID);
const file = snapshot.files[0];
if (!file) throw new Error("Demo file was not seeded");

const attempts = await Promise.all(
  Array.from({ length: 25 }, (_, index) =>
    store.applyWrite({
      tenantId: GRAPH_TENANT_ID,
      repositoryId: GRAPH_REPOSITORY_ID,
      agentId: index % 2 === 0 ? "agent-policy-subagent" : "agent-case-subagent",
      path: GRAPH_POLICY_PATH,
      expectedFileHash: file.contentHash,
      content: JSON.stringify({ refund_window_days: 7 + index, currency: "USD" }, null, 2),
      summary: `Concurrent policy candidate ${index + 1}`,
      sourceRevision: `stress-candidate-${index + 1}`,
    }),
  ),
);

const applied = attempts.filter((item) => item.event.outcome === "applied");
const rejected = attempts.filter((item) => item.event.outcome === "rejected_stale");
console.log(JSON.stringify({ attempted: attempts.length, applied: applied.length, rejected: rejected.length }, null, 2));
if (applied.length !== 1) throw new Error(`Expected one winner, observed ${applied.length}`);
