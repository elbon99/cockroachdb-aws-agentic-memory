import { InMemoryReceiptStore } from "@/lib/receipts/in-memory-store";
import type { ReceiptStore } from "@/lib/receipts/store";

const globalState = globalThis as typeof globalThis & { contextSealReceiptStore?: Promise<ReceiptStore> };

async function createStore(): Promise<ReceiptStore> {
  const store = process.env.DATABASE_URL?.trim()
    ? new CockroachReceiptStore(process.env.DATABASE_URL.trim())
    : new InMemoryReceiptStore();
  if ((await store.snapshot()).sources.length === 0) await store.reset();
  return store;
}

export async function getReceiptStore(): Promise<ReceiptStore> {
  globalState.contextSealReceiptStore ??= createStore();
  return globalState.contextSealReceiptStore;
}

export async function resetReceiptStore(): Promise<ReceiptStore> {
  const store = await getReceiptStore();
  await store.reset();
  return store;
}
import { CockroachReceiptStore } from "@/lib/receipts/cockroach-store";
