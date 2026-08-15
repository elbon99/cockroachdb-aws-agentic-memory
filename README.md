# ContextSeal

**Git-aware, validity-gated memory for multi-agent systems.**

ContextSeal anchors agent claims to exact versions of files and sub-file artifacts. When Git, another agent, or an external process changes the underlying evidence, CockroachDB atomically invalidates every directly and transitively dependent memory before retrieval can admit it into another agent's context.

> Vector search discovers potentially relevant memories. Evidence lineage decides whether they are still allowed to influence an action.

## Hackathon workflow

1. A case-evaluator subagent reads `policies/refund-policy.json#/refund_window_days` at value `30`.
2. Its conclusion that a 14-day-old damaged order is refundable is anchored to that artifact version.
3. A policy subagent or remote Git change overwrites the value with `7`.
4. ContextSeal appends a new artifact version and recursively invalidates the policy claim and case conclusion.
5. Semantic recall still finds the obsolete conclusion, but the validity gate withholds it.
6. The root agent re-verifies the new value and publishes replacement claims; historical claims remain replayable.
7. An unrelated claim anchored to `/currency` remains valid, proving selective invalidation.

The demo also races two writes with the same expected file hash. Exactly one applies; the other is recorded as `rejected_stale`.

## Architecture

```text
Git remote-first preflight
        |
        v
read/write receipts ---- root and subagent identities
        |
        v
artifact -> artifact version -> claim -> derived claim
        |                          |
        +---- atomic invalidation -+
        |
        v
CockroachDB relational graph + VECTOR search
        |
        +---- Managed MCP read-only audit views
        |
        v
Bedrock claim proposal -> deterministic selector/hash validation
```

CockroachDB stores artifact versions, claims, dependency edges, read receipts, write events, agent lineage, vectors, and historical validity. A serializable transaction performs expected-hash admission, version publication, recursive invalidation, and audit insertion.

Bedrock may propose a replacement claim from an artifact diff. It cannot establish evidence, change a selector, or decide freshness; deterministic validation does that before persistence.

## Current verification status

- TypeScript type-check: passing.
- Vitest: 7 tests passing.
- Next.js production build: passing.
- Local HTTP demo: all six transitions passing.
- CockroachDB schema and runtime adapter: implemented; live cloud credential run pending.
- Bedrock Converse adapter: implemented; live AWS credential run pending.
- Visual browser QA: pending because no browser surface was available in the current desktop session.

Local mode is labeled `local-demo`; it must not be presented as CockroachDB proof in the submission video.

## Run locally

Requires Node.js 24 or later.

```bash
npm install
npm run dev
npm run typecheck
npm test
npm run build
```

Open `http://localhost:3000`.

## Run with CockroachDB

Copy `.env.example` to `.env.local` and set `DATABASE_URL`.

```bash
npm run db:migrate
npm run db:seed
npm run demo:stress
npm run dev
```

Set `CONTEXTSEAL_AUTO_SEED=true` only for a disposable demo database. The Managed MCP server can expose `mcp_memory_validity` and `mcp_agent_file_audit` as read-oriented audit views.

## Run with Bedrock

Provide AWS credentials through the standard AWS SDK credential chain and set:

```text
AGENT_ENGINE=bedrock
AWS_REGION=us-east-1
BEDROCK_MODEL_ID=amazon.nova-lite-v1:0
```

The re-verification step calls Bedrock and returns real token/latency telemetry. An unverified selector is rejected.

## Git behavior

ContextSeal checks remote identity before worktree status and never runs `git pull` automatically. If remote access fails, it reports `remoteFreshness: unknown` without pretending the repository is current. Git covers committed changes; ContextSeal receipts cover uncommitted root/subagent work.

## Submission deadline

August 18, 2026 at 5:00 PM EDT — August 19, 2026 at 2:30 AM IST.

See [MEMORY_GRAPH_DIRECTION.md](docs/MEMORY_GRAPH_DIRECTION.md), [ARCHITECTURE.md](docs/ARCHITECTURE.md), and [HACKATHON_REQUIREMENTS.md](docs/HACKATHON_REQUIREMENTS.md).
