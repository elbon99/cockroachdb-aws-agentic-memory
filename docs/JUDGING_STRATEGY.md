# Judging strategy

This is a derived strategy, not an official rubric.

## Thesis

To be competitive, the project should make a judge understand in under a minute:

> This agent is materially better because it remembers verified outcomes over time, and CockroachDB is the reason that memory is durable, searchable, transactional, and usable in production.

## Map implementation to every judging category

### Agentic Memory Design

Winning evidence:
- structured durable state in CockroachDB,
- vector/semantic retrieval over past events,
- transactional linkage between observation → decision → action → outcome,
- memory provenance and timestamps,
- memory changes future decisions,
- visible demonstration of learning/reuse.

Avoid:
- only chat history,
- storing embeddings without demonstrating retrieval impact,
- adding CockroachDB after architecture is already complete.

### Technological Implementation

Winning evidence:
- two or more CockroachDB tools are visibly useful,
- safe data access,
- schema designed around real agent state,
- idempotent actions,
- retries and failure semantics,
- explicit tool boundaries,
- tests/evals.

### Real-World Impact

Choose a workflow where:
- the event happens often enough to matter,
- context is fragmented,
- the decision is expensive or time-consuming,
- historical outcomes improve the next decision,
- an agent can operate real tools.

This is why operations/incident response is attractive.

### Product Readiness

Show:
- human control at consequential boundaries,
- auditability,
- health verification after action,
- failure handling,
- observable timeline,
- security boundaries,
- deterministic demo/evaluation fallback.

### Creativity / Originality

Originality should come from the **memory model and feedback loop**, not novelty-for-novelty's sake.

The differentiator should answer:

> What can this system do on incident #10 that it could not do on incident #1?

## Demo-first design

A good three-minute arc:

1. **Problem (15–25 s)** — establish a costly recurring workflow.
2. **Cold/initial behavior (20–30 s)** — show the agent investigating and acting.
3. **Memory write (20–30 s)** — visibly persist evidence/outcome to CockroachDB.
4. **Similar future event (35–45 s)** — retrieve prior memory and behave better/faster.
5. **Verification/safety (25–35 s)** — show result check and/or human gate.
6. **Architecture proof (20–30 s)** — show CockroachDB + AWS role clearly.
7. **Impact close (10–15 s)**.

## Scope rule

For a solo build, prioritize:

- 1 core workflow,
- 1 agent loop,
- 3–5 meaningful tools,
- 1 strong memory model,
- 1 highly legible UI,
- 1 evaluation harness,
- excellent submission materials.

Do not build a generalized agent platform.
