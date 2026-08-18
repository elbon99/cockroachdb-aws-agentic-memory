# Session wrap-up - 2026-08-19

## Decision

The project was not submitted to the CockroachDB x AWS hackathon. The deadline passed before the required live sponsor integration, public deployment, public repository, and video were complete. The repository is being preserved as a post-hackathon prototype.

The strongest current product framing is:

> ContextSeal provides evidence-current authorization for policy-sensitive agent actions. A reviewed memory can authorize an action only while the exact evidence fragments that established it remain current.

Avoid presenting ContextSeal as a generally novel agent-memory platform. Provenance, temporal memory, and automatic invalidation already exist in products and projects such as Zep, Amazon Bedrock AgentCore Memory, Mem0, GitHub Copilot Memory, m1nd, rag-rat, and Graphiti.

## What exists

- A Next.js demo implementing receipt, fragment, reviewed-memory, dependency, invalidation, recall, and action-receipt concepts.
- A deterministic in-memory mode that demonstrates an approved refund-policy memory becoming stale and being withheld after its cited policy fragment changes.
- A CockroachDB schema with operational memory state, reviews, dependencies, action receipts, and a vector index.
- A CockroachDB repository with serializable transactions and retry handling for SQLSTATE `40001`.
- Registered file, HTTP, and named SQL observation adapters with bounded access controls.
- Optional Bedrock claim-generation and embedding adapters.
- Read-oriented SQL views intended for a Managed MCP auditor.
- Local screenshots in `.artifacts/screenshots/`; these are intentionally excluded from Git.

## Verified locally

Using Node 24.6.0:

- `npm run typecheck` passed.
- `npm test` passed: 2 test files, 5 tests.
- `npm run build` passed.
- The independent judge ran the full local API sequence and confirmed stale-memory withholding and replacement behavior.

The machine's default Node version was still 14.21.3 during the final review. Node 24.6.0 is installed through NVM and is required by `package.json`.

## Independent judge history

| Review | Score | Eligibility | Main finding |
|---|---:|---|---|
| Earlier memory-graph prototype | 18.5/50 | Fail as demonstrated | The local deterministic path worked, but CockroachDB, MCP, Bedrock, AWS deployment, public app, and video were absent. |
| Current receipt-gated prototype | 19.0/50 | Fail as demonstrated | Fragment-level authorization is sharper, but sponsor integrations remain optional and the main demo still bypasses the real HTTP/SQL adapters. |

Current criterion scores: Agentic Memory Design 5.0, Technical Implementation 4.0, Real-World Impact 4.0, Production Readiness 2.5, Creativity and Originality 3.5.

## Critical gaps

1. No demonstrated CockroachDB Cloud execution, persistence, vector query plan, or contention run.
2. No genuine Managed MCP client or auditor-agent call. Environment configuration plus SQL views do not constitute an MCP integration.
3. No demonstrated Bedrock invocation or AWS-hosted application.
4. The primary demo synthesizes HTTP and SQL observations in-process instead of invoking the registered adapters.
5. Recall and action are separate operations, creating a time-of-check/time-of-use race.
6. Demo mutation endpoints are unauthenticated; tenant and reviewer identities are hard-coded.
7. The refund action records an action receipt but does not execute and verify a bounded external action.
8. No realistic corpus, retrieval evaluation, user validation, or quantified impact exists.

## Why sponsor integration was not completed

Development continued against the deterministic local fallback after external credentials were unavailable. The live CockroachDB and AWS paths were treated as optional configuration rather than the next mandatory milestone. UI polish and screenshots happened before a live database, Bedrock invocation, MCP query, and AWS deployment were verified. Future work should reverse that order.

## Recommended restart point

Do not add new product scope. Start with the first seven tasks in [TODO.md](../TODO.md), ending with one deployed workflow in which:

1. a real adapter creates an immutable receipt;
2. Bedrock proposes a bounded memory;
3. a human approves it;
4. CockroachDB stores and retrieves it;
5. changed evidence invalidates it transactionally;
6. the action path revalidates it atomically; and
7. a Managed MCP auditor explains the complete provenance chain.

Only after this path works should the project add broader adapters, multi-agent demonstrations, benchmarks, or presentation work.
