# Managed MCP auditor

ContextSeal uses the CockroachDB Cloud Managed MCP server as a separate, read-only auditor—not as the application's write path. The application uses parameterized serializable SQL transactions; the auditor explains persisted proof after the fact.

## Connection

Configure the official HTTPS endpoint `https://cockroachlabs.cloud/mcp` with the submission cluster ID. Prefer OAuth and grant read consent only. If a service-account API key is used, keep it outside the repository and scope it to the demo cluster.

## Three-minute demo prompt

> Using SELECT queries only, inspect `mcp_receipt_audit` and `mcp_memory_decisions`. Explain which exact policy fragment supported the first refund action, why that memory later became stale, and which reviewed replacement supported the final action. Include observation IDs, source versions, fragment hashes, memory statuses, and action outcomes. Do not mutate any data.

Expected proof:

- two policy observations with different source versions and `/refund_window_days` hashes;
- the first approved memory has `status = 'stale'` and an invalidation reason;
- the replacement memory is approved and valid;
- both action receipts point to the memory that authorized them.

Official Managed MCP documentation recommends OAuth because its short-lived tokens are safer and supports explicit read-only consent. Do not grant write consent for the auditor.
