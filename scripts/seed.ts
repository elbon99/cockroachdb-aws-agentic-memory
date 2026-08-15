import { createMemoryGraphSeed } from "../src/lib/memory-graph/fixtures";
import { CockroachGraphStore } from "../src/lib/memory-graph/cockroach-store";

try { process.loadEnvFile(".env.local"); } catch { /* Environment variables may be injected. */ }

const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) throw new Error("DATABASE_URL is required");

const store = new CockroachGraphStore(databaseUrl);
await store.reset(createMemoryGraphSeed());
console.log("ContextSeal graph demo seeded successfully.");
