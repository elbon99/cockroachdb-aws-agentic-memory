import { CockroachReceiptStore } from "../src/lib/receipts/cockroach-store";

try { process.loadEnvFile(".env.local"); } catch { /* Environment variables may be injected. */ }

const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) throw new Error("DATABASE_URL is required");

const store = new CockroachReceiptStore(databaseUrl);
await store.reset();
console.log("ContextSeal tool-receipt demo seeded successfully.");
