# CockroachDB × AWS Agentic Memory Hackathon

Research and decision workspace for the **CockroachDB × AWS Hackathon — Build with Agentic Memory**.

## Current status

**Phase:** research / architecture selection  
**Submission deadline:** August 18, 2026 at 5:00 PM EDT (August 19, 2026 at 2:30 AM IST)  
**Target:** build a submission that is competitive for the overall top three, not merely a functioning demo.

## Challenge in one sentence

Build an **agentic application deployed on AWS where CockroachDB is a meaningful persistent memory layer**, and demonstrate that the memory materially changes what the agent can do.

## Working principles

1. One excellent end-to-end workflow beats a broad platform.
2. CockroachDB memory must be load-bearing, not decorative.
3. The agent must **observe → retrieve memory → reason → act → verify → persist new memory**.
4. Sponsor technology should be visible in the core product story and the demo.
5. Verification, safety, failure handling, and observability are product features.
6. Design the three-minute demo while designing the architecture.
7. Scope for a solo developer using AI coding assistance.

## Candidate product direction

A **durable operational/incident memory agent** is currently the leading direction, but it is not frozen yet.

The central idea is that an operations agent should remember:
- prior incidents and symptoms,
- investigation evidence,
- fixes attempted,
- whether those fixes worked,
- human decisions/overrides,
- service-specific patterns,
- confidence and recency of learned knowledge.

When a new incident occurs, it should retrieve relevant historical memory, investigate current evidence, recommend or take bounded action, verify the result, and write the outcome back as new memory.

See `docs/PROJECT_DIRECTION.md`.

## Repository context

Start with:
- `AGENTS.md`
- `docs/HACKATHON_REQUIREMENTS.md`
- `docs/JUDGING_STRATEGY.md`
- `docs/WINNER_RESEARCH.md`
- `docs/PROJECT_DIRECTION.md`
- `docs/OPEN_QUESTIONS.md`

No implementation decisions are considered final until explicitly recorded.
