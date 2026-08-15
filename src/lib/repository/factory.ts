import { createDemoSeed } from "@/lib/domain/fixtures";
import { CockroachContextSealRepository } from "@/lib/repository/cockroach-repository";
import { MemoryContextSealRepository } from "@/lib/repository/memory-repository";
import type { ContextSealRepository } from "@/lib/repository/repository";

declare global {
  // eslint-disable-next-line no-var
  var __contextSealRepository: Promise<ContextSealRepository> | undefined;
}
async function createRepository(): Promise<ContextSealRepository> {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (databaseUrl) {
    return new CockroachContextSealRepository(databaseUrl);
  }

  const repository = new MemoryContextSealRepository();
  await repository.reset(createDemoSeed());
  return repository;
}

export function getRepository(): Promise<ContextSealRepository> {
  globalThis.__contextSealRepository ??= createRepository();
  return globalThis.__contextSealRepository;
}

export async function resetRepository(): Promise<ContextSealRepository> {
  const repository = await getRepository();
  await repository.reset(createDemoSeed());
  return repository;
}
