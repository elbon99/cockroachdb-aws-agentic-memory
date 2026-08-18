# ContextSeal

**Memory that proves why it is still true.**

ContextSeal converts file, HTTP, and SQL tool results into immutable receipts. Agent memories cite exact response fragments, enter a human review queue, and are automatically withheld when those fragments change. A consequential action can execute only from an approved, current memory.

## Three-minute demo

1. Observe a 30-day refund policy through the registered GitHub Contents adapter and a 14-day damaged order through a named SQL query.
2. Amazon Bedrock proposes “eligible”; a human approves it; the bounded refund action executes.
3. Change the upstream policy to seven days and refresh the source.
4. CockroachDB atomically marks the dependent memory stale. Vector recall still discovers it, but the validity gate withholds it and blocks reuse.
5. Bedrock proposes “ineligible” from the new receipt, a human approves it, and the bounded denial action executes.
6. A read-only CockroachDB Managed MCP auditor explains the receipts, review, invalidation, and action.

The browser includes a deterministic local fallback for reproducibility. It is visibly labeled `local-demo` and is not the sponsor proof.

## Why the sponsors are essential

- **CockroachDB Cloud** is the serializable system of record for observations, selected fragments, memory dependencies, reviews, and action receipts. Its distributed vector index discovers semantically relevant claims; relational validity gates decide whether they may influence an action. Managed MCP exposes read-only audit views.
- **AWS Bedrock** uses Nova Lite to propose bounded claims from receipts and Titan Text Embeddings V2 to generate normalized 256-dimensional vectors. Amplify hosts the Next.js application with an SSR compute role; credentials stay server-side.

## Explicit tool adapters

- `observe_http_source`: registered GitHub owner/repo/path only, GET-only, redirect-disabled, five-second timeout, one-megabyte limit.
- `observe_sql_query`: named, parameterized, read-only `get_order` query only; arbitrary SQL is impossible.
- `observe_file`: path constrained beneath `CONTEXTSEAL_FILE_ROOT`; secret-looking files are rejected; hosted ingestion requires a private bearer token.

All adapters emit the same observation and fragment contract. Whole responses are hashed, but selective invalidation compares only fragments a memory actually cited.

## Run

Node 24 or later is required.

```bash
npm install
npm run dev
npm run typecheck
npm test
npm run build
```

For sponsor mode, copy `.env.example` to `.env.local`, provide `DATABASE_URL`, migrate, and enable Bedrock:

```bash
npm run db:migrate
npm run db:seed
npm run demo:stress
npm run dev
```

Set `AGENT_ENGINE=bedrock`. The standard AWS SDK credential chain supplies credentials locally; Amplify should use an SSR compute role with only `bedrock:InvokeModel` access to the configured Nova and Titan model ARNs. Do not expose database or AWS credentials to the browser.

## Audit surfaces

- `mcp_receipt_audit`: source, version, response hash, selected fragment hashes, run, and step.
- `mcp_memory_decisions`: proposal provenance, review decision, validity, invalidation, and authorized action.

See [TOOL_RECEIPT_ARCHITECTURE.md](docs/TOOL_RECEIPT_ARCHITECTURE.md) for the active contract. Earlier research files are retained as decision history.
The exact read-only auditor setup and demo prompt are in [MCP_AUDITOR.md](docs/MCP_AUDITOR.md).
