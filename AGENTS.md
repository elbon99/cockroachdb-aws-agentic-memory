# Instructions for Codex and coding agents

This repository is being built for the **CockroachDB × AWS Hackathon — Build with Agentic Memory**.

## Read first

Before proposing architecture or writing application code, read all files under `docs/`.

Treat `docs/HACKATHON_REQUIREMENTS.md` as a hard constraint document.

## Current phase

We are in **problem selection and architecture design**.

Do not expand scope merely because implementation is easy with an AI coding agent.

## Optimization target

Optimize for a **top-three hackathon submission**.

That means balancing:
- Agentic Memory Design
- Technological Implementation
- Real-World Impact
- Product Readiness
- Creativity / Originality

These are equally weighted in the official judging rules.

## Product rule

Prefer:

> one memorable workflow + strong memory + real tools + verification + polished demo

over:

> many agents + many screens + many integrations + shallow implementation.

## Agent loop

The preferred conceptual loop is:

1. Observe current state/event.
2. Retrieve structured and semantic memory from CockroachDB.
3. Reason over current evidence + retrieved memory.
4. Select a bounded action.
5. Execute through explicit tools.
6. Verify whether the action worked.
7. Persist the evidence, decision, outcome, and learned memory.
8. Repeat only when necessary.

Do not collapse this into a chatbot/RAG interface.

## Memory requirements

CockroachDB must be used for more than storing chat history.

Candidate memory types:
- durable task/incident state,
- structured event history,
- embeddings / semantic memory,
- action outcomes,
- human approvals/overrides,
- verification results,
- confidence / provenance / timestamps,
- transactional state needed for safe retries.

Memory should influence future behavior in a way that can be demonstrated.

## Safety / engineering expectations

Build explicit:
- idempotency,
- bounded actions,
- human approval where consequential,
- retries/timeouts,
- audit trail,
- failure handling,
- health/verification checks,
- evaluation scenarios.

Do not claim reliability that is not demonstrated.

## Hackathon-specific constraints

The finished submission must meaningfully use:
- **at least two CockroachDB tools** from the allowed list, and
- **at least one AWS service**.

The final repository must be public and open-source with a recognized license.

A sub-three-minute demo must visibly show the CockroachDB memory layer at work.

## Development policy

AI coding assistants are explicitly permitted by the rules. Keep the project newly created during the hackathon submission period and document any pre-existing code or external assets incorporated.

## Decision hygiene

When a meaningful architecture/product decision is made, update the appropriate document instead of leaving the decision only in chat history.

When uncertain, state the tradeoff and keep it open rather than silently choosing.
