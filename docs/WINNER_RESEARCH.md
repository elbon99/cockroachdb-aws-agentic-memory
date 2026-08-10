# Research: recent winning agent projects

Purpose: extract reusable design patterns, not clone products.

Research snapshot: **2026-08-10**.

---

## AutoSRE — Google Cloud Rapid Agent Hackathon, Dynatrace 1st Place

**Developer:** Maksim Silchenko (solo)  
**Prize for track 1st:** $5,000

### Product

Autonomous incident-response/on-call agent that reads Dynatrace telemetry, diagnoses an incident, proposes one remediation, requires explicit human approval, executes only after approval, and verifies recovery.

### Core loop

`DETECT → DIAGNOSE → PROPOSE → PAUSE → ACT → VERIFY`

### Notable implementation choices

- Gemini 3 via Vertex AI.
- Google Agent Development Kit.
- Dynatrace MCP as the load-bearing telemetry interface.
- FastAPI backend and Next.js UI.
- Framework-enforced human approval rather than prompt-only safety.
- Server-side bounds on remediation tools.
- Audit trail for approval and rejection.
- Deterministic/offline demo mode.
- 25-run evaluation harness.
- Reported 25/25 correct, 0 false actions, and 5/5 no-action traps refused.
- 71-test suite.
- Published security audit/checklist.
- Dedicated architecture/demo/submission/video-script documentation in the repository.

### Why it matters to us

The strongest lesson is not “build an SRE agent.”

It is that a solo developer can win by making a **narrow workflow unusually complete**:
- explicit state machine,
- sponsor integration at the center,
- safety,
- verification,
- evals,
- polished demo,
- extensive submission documentation.

Sources:
- https://devpost.com/software/autosre-the-autonomous-on-call-engineer
- https://github.com/thylinao1/autosre

---

## HackOverflow — TreeHacks 2026 winner (Fetch.ai multi-agent track; RunPod winner)

**Team:** 4 developers

### Product

Persistent, shared, verified knowledge layer for AI agents. Agents store and retrieve solutions instead of repeatedly solving the same problems from scratch.

### Architecture ideas relevant to this hackathon

- Persistent memory is the product, not a support feature.
- Elasticsearch acts as data + vector retrieval layer.
- Candidate fixes are executed in isolated environments before being treated as verified knowledge.
- Specialized agents perform orchestration/discovery.
- Retrieval combines semantic and keyword-oriented mechanisms.
- Developer tooling explicitly included Claude, Cursor, and v0.

### Key lesson

**Memory quality improves when outcomes are verified.**

For our project, storing “the agent thought X” is weaker than storing:
- evidence,
- action,
- verification result,
- success/failure,
- provenance.

Sources:
- https://devpost.com/software/hackoverflow-stack-overflow-for-ai-agents-at-hackathons
- https://github.com/IshaanChamoli/treehacks26

---

## LORE — GitLab AI Hackathon Grand Prize

**Team:** 2 developers  
**Overall grand prize:** $15,000

### Product

Institutional memory for software teams. LORE extracts engineering decisions and commitments from development workflows, checks future work against them, supports overrides, and evolves the stored organizational memory.

### Relevant ideas

- Memory is structured around **decisions and outcomes**, not raw conversation.
- New decisions can supersede old memory.
- Conflicts are surfaced explicitly.
- Memory can be queried conversationally, but search is only one interface.
- Product connects memory to active workflow checkpoints.
- Submission reported 43 tests.
- Multi-agent architecture is used for specialized workflow responsibilities.

### Key lesson

A valuable memory system needs **evolution semantics**:

- When is old memory still valid?
- When should it be superseded?
- Who/what changed it?
- Why?
- What confidence should future agents place in it?

Sources:
- https://devpost.com/software/lore-living-organizational-record-engine
- https://gitlab.devpost.com/updates/41783-meet-the-winners

---

## Cassandra — Google Cloud Rapid Agent Hackathon, Arize 1st Place

**Team:** 2 developers  
**Prize for track 1st:** $5,000

### Product

Supervisor for other AI agents. It watches traces/behavior, detects failures or hallucination-like problems, evaluates agent behavior, and creates a feedback/improvement loop.

### Relevant ideas

- An agent should be observable as a system, not treated as an opaque model call.
- Feedback/evaluation belongs inside the product loop.
- Persistent trend/history can reveal recurring failure patterns.
- The most useful “memory” may be operational evidence rather than conversation.

Source:
https://devpost.com/software/cassandra-jilmgy

---

## Globot — Gemini 3 Hackathon Grand Prize

**Prize:** $50,000 overall grand prize

### Why it is useful as a reference

Globot is more useful to us as a reference for **product presentation, orchestration, and human-in-the-loop decision support** than as a direct memory architecture template.

Devpost later reviewed questions about its code history and confirmed its eligibility; the large initial code snapshot contained significant scaffolding/lockfile/data content and evolved from work created inside the hackathon window.

### Key lesson

Do not confuse source-code volume with hackathon quality.

Judges reward:
- legible product value,
- cohesive workflow,
- technical evidence,
- integration,
- demo quality.

Sources:
- https://gemini3.devpost.com/updates
- https://gemini3.devpost.com/forum_topics/43709-gemini-3-hackathon-update-on-the-eligibility-review
- https://github.com/Vector897/Globot

---

# Cross-project pattern

The recurring winning loop is:

`OBSERVE → RETRIEVE CONTEXT → REASON → CHOOSE ACTION → USE TOOLS → VERIFY → PERSIST → REPEAT`

Common primitives:

1. **Memory** — durable context/state.
2. **Orchestration** — explicit progression through a workflow.
3. **Tools** — ability to affect or inspect the real world.
4. **Evaluation** — evidence that the output/action was correct.
5. **Human authority** — kept at consequential boundaries where appropriate.
6. **Submission engineering** — architecture docs, tests, demo scripts, reproducible demo state.

For CockroachDB, **Memory must be the centerpiece**.
