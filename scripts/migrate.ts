import { readFile } from "node:fs/promises";

import { Pool } from "pg";

try { process.loadEnvFile(".env.local"); } catch { /* Environment variables may be injected. */ }

const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) throw new Error("DATABASE_URL is required");

const schemaUrl = new URL("../db/schema.sql", import.meta.url);
const pool = new Pool({ connectionString: databaseUrl, application_name: "contextseal-migrate" });

try {
  await pool.query(await readFile(schemaUrl, "utf8"));
  console.log("ContextSeal schema applied successfully.");
} finally {
  await pool.end();
}
