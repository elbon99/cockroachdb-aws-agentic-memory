import { createMemoryGraphSeed } from "@/lib/memory-graph/fixtures";
import { CockroachGraphStore } from "@/lib/memory-graph/cockroach-store";
import { InMemoryGraphStore } from "@/lib/memory-graph/in-memory-store";
import type { MemoryGraphStore } from "@/lib/memory-graph/store";

declare global {
  // eslint-disable-next-line no-var
  var __memoryGraphStore: Promise<MemoryGraphStore> | undefined;
}

async function createStore(): Promise<MemoryGraphStore> {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (databaseUrl) {
    const store = new CockroachGraphStore(databaseUrl);
    if (process.env.CONTEXTSEAL_AUTO_SEED === "true") {
      await store.reset(createMemoryGraphSeed());
    }
    return store;
  }

  // Local mode remains deliberately explicit so a disconnected demo never
  // impersonates cloud proof.
  const store = new InMemoryGraphStore();
  await store.reset(createMemoryGraphSeed());
  return store;
}

export function getMemoryGraphStore(): Promise<MemoryGraphStore> {
  globalThis.__memoryGraphStore ??= createStore();
  return globalThis.__memoryGraphStore;
}

export async function resetMemoryGraphStore(): Promise<MemoryGraphStore> {
  const store = await getMemoryGraphStore();
  await store.reset(createMemoryGraphSeed());
  return store;
}
