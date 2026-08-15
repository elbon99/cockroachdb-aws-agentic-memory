# Idea-stage evaluation

Date: **2026-08-13**

Status: **decision input, not implementation evidence**

## Method

Eight candidate ideas were evaluated independently using the repository skill at:

`/.agents/skills/evaluate-hackathon-prototype/`

Each candidate was given to a fresh, context-isolated skeptical evaluator. Every evaluator received only:

- a neutral idea card;
- the official hackathon URLs;
- the five equally weighted judging criteria;
- instructions to research current alternatives and recent problem evidence.

The evaluators did not receive prior rankings, debate history, expected answers, or preferred directions.

Important limitations:

- These are **idea-stage projections**, not earned hackathon scores.
- No candidate has implementation, deployment, production-readiness, or demo evidence yet.
- Independent evaluators calibrated idea-stage scores differently. Rankings therefore use the full verdict: evidence, ceiling, differentiation, demoability, CockroachDB necessity, AWS necessity, and solo-build risk—not totals alone.

## Summary

Every evaluator recommended **Narrow**. None recommended implementing the broad version unchanged.

| Rank | Candidate | Current concept score | Strong-build ceiling | Solo risk | Decision |
|---:|---|---:|---:|---:|---|
| 1 | Governed context initialization | 24/50 | 40–42 | 8/10 | Narrow |
| 2 | Transactional agent-cost governor | 24/50 | ~41 | 9/10 | Narrow |
| 3 | Organizational truth registry | 21.5/50 | 39–41 | 9/10 | Narrow |
| 4 | Context release control plane | 16/50 | High 30s | 8.5/10 | Narrow |
| 5 | Human-managed shared memory | 19/50 | ~38 | High | Narrow |
| 6 | Cross-machine agent chat | 10/50 | 35–39 | 8/10 | Narrow |
| 7 | Verified incident memory | 13/50 | High 30s | 8/10 | Narrow |
| 8 | Selective auto-compaction | 27/50* | Limited by novelty | High | Narrow |

\* The auto-compaction evaluator scored prospective architecture more generously than other evaluators, while separately finding weak CockroachDB necessity, substantial overlap, and high client-integration risk.

## Decision

Proceed to falsification and prototype design with:

> **A client-neutral, replayable context-receipt service that atomically binds an agent session to the exact authorized policy and knowledge versions used for its decisions.**

Do not position it as:

- a company brain;
- generic agent memory;
- enterprise search;
- generic permission-aware RAG;
- a universal context-governance platform.

The first prototype must answer:

> Can two agents performing the same task receive different, correct, authorized, token-bounded context—and can we later reconstruct exactly why each agent saw what it saw?

If the result looks like ordinary permission-filtered RAG, the direction is falsified and should be narrowed or changed before expansion.

---

# 1. Governed context initialization

## Narrowed product

> A client-neutral context-receipt service that atomically binds an agent session to the exact authorized policy and knowledge versions used for its decisions.

## Problem evidence

Evidence supports the underlying problem:

- Large or excessive context can degrade agent performance; high-signal context selection matters.
- Permission errors in enterprise connectors can expose restricted information.
- Enterprise agent governance increasingly requires identity propagation, least privilege, and reconstructable audit data.

The unvalidated market claim is that enterprise teams want a separate client-neutral initialization layer instead of permission-aware retrieval inside existing platforms.

## Closest alternatives

- Oracle Agent Memory
- Kong Context Mesh
- Microsoft 365 Copilot Semantic Index and connectors
- Salesforce Agentforce/Data 360/MuleSoft governance
- OpenAI Frontier
- Collibra
- LangGraph persistent stores
- ContextNest

The category itself is crowded. The remaining wedge is **decision-time context receipts** containing immutable block versions, hashes, identity/purpose claims, authorization decisions, exclusions, token allocation, provenance, and historical reconstruction.

## Projected rubric

| Criterion | Score | Required proof |
|---|---:|---|
| Agentic Memory Design | 7/10 | Immutable blocks, version-pinned manifests, dependency graph, consumption receipts, and agent behavior changed by retrieved context |
| Technical Implementation | 2/10 | Schema, transactions, vector query, MCP access, retry handling, tests, and deployed integration |
| Real-World Impact | 6.5/10 | One precise workflow, user evidence, reduced errors/tokens/setup, two client adapters |
| Production Readiness | 2/10 | Threat model, fail-closed authorization, tenancy, revocation, retention, audit, metrics, and failure tests |
| Creativity & Originality | 6.5/10 | Exact replay, coherent supersession, and client portability beyond existing permission-aware retrieval |
| **Current projected total** | **24/50** | Potential ceiling: **40–42/50** with strong proof |

## CockroachDB necessity

Strongest use:

- atomically publish one coherent manifest across block versions, policy decisions, and audit records;
- prevent a session from observing mixed old/new canonical state;
- colocate structured authorization/provenance state with vector candidate retrieval;
- preserve historical manifests and reconstruct prior decisions.

Required demonstration:

- race session creation against policy supersession and produce zero mixed-version manifests;
- show an actual distributed vector query on the critical retrieval path;
- show transaction retry handling rather than merely claiming serializable isolation.

PostgreSQL plus pgvector remains a credible substitute unless concurrency, resilience, and unified operational/vector consistency are visibly demonstrated.

## AWS necessity

AWS must be more than hosting:

- identity/task attributes enter through an AWS identity boundary;
- a source update triggers Lambda compilation;
- Bedrock produces a proposed summary, never the authorization decision;
- block metadata records model, prompt/template, source hash, and compiler versions;
- the new CockroachDB version becomes active while the old receipt remains replayable.

Authorization must remain deterministic and fail closed. Bedrock must not decide who may see a block.

## Three-minute proof

1. Alice and Bob submit the same task with different roles.
2. Show their signed identity/purpose inputs.
3. Show a manifest diff: shared blocks, role-only blocks, exclusions/reasons, hashes, and token counts.
4. Show different but correct answers.
5. Supersede a policy and create a new coherent session manifest.
6. Reconstruct the old session from its exact receipt.
7. Show the CockroachDB transaction/vector evidence and actual AWS execution path.

## Falsification tests

1. **Demand:** Interview enterprise AI/platform/security owners. Fail if the cross-client initialization/reconstruction problem is already acceptably handled or no team would pilot a neutral capsule API.
2. **Outcome:** Compare governed capsules with permission-aware top-k RAG across stale, conflicting, excessive, and unauthorized blocks. Require zero unauthorized disclosure plus material error or token reduction.
3. **Database necessity:** Concurrently create sessions while superseding policies and injecting retries/faults. Fail the CockroachDB thesis if a simpler PostgreSQL design produces the same relevant guarantees and operational behavior.

## Verdict

**Narrow, 82% confidence.** This is the selected direction for the next decision gate.

---

# 2. Transactional agent-cost governor

## Narrowed product

> A transaction-safe authorization ledger for multi-agent spend that reuses proven execution artifacts and reconciles every parent/child reservation.

## Evidence and alternatives

Agent cost is a real systems problem: reasoning loops, retries, context, tools, and multi-agent coordination create nonlinear spend. AWS's Agentic AI guidance explicitly covers routing, compression, caching, ceilings, attribution, and feedback loops.

The broad feature set overlaps heavily with:

- Portkey
- LiteLLM
- Langfuse
- Helicone
- Databricks Unity AI Gateway
- Bedrock prompt caching and intelligent routing

The defensible wedge is pre-execution **reserve/delegate/reconcile** semantics across many agents sharing one budget, combined with cost-per-success artifact reuse.

## Projected rubric

| Criterion | Score |
|---|---:|
| Agentic Memory Design | 6.5/10 |
| Technical Implementation | 1.5/10 |
| Real-World Impact | 7.5/10 |
| Production Readiness | 3.5/10 |
| Creativity & Originality | 5/10 |
| **Current projected total** | **24/50** |

Credible strong-build ceiling: approximately **41/50**.

## Necessity and demo

CockroachDB is well suited to reservations, reconciliation, leases, idempotency, lineage, and concurrent shared-budget debits. It becomes specifically compelling only with contention/failover or multi-region proof. Vector search is weak unless analogous successful execution plans materially improve outcomes.

Bedrock provides real model/cache telemetry and a fair routing baseline. The project must outperform Bedrock and gateway incumbents—not an intentionally naive expensive-model baseline.

The proposed demo launches 500 simulated agents against one fixed pool and proves:

- committed spend plus worst-case reservations never exceeds the budget;
- one idempotency key is never debited twice;
- killed workers leave recoverable/expiring reservations;
- retry cascades stop at the configured boundary;
- one artifact producer wins and followers reuse its result;
- cost per accepted success improves without material quality loss.

## Falsification tests

1. Qualified buyer interviews must reveal budget/retry/reuse failures not adequately solved by current gateways.
2. Reproduce the workflow with Portkey or LiteLLM plus PostgreSQL/Redis; pivot to an integration if it achieves the same result cheaply.
3. Require zero oversubscription and a material cost-per-success reduction against the strongest incumbent baseline under faults.

## Verdict

**Narrow, 86% confidence.** Strong runner-up, but riskier and easier to classify as FinOps rather than agentic memory.

---

# 3. Organizational truth registry

## Narrowed product

> A governed policy-decision ledger for high-impact agent actions, initially refund policy.

## Evidence and alternatives

Memory poisoning, drift, stale context, and cross-agent propagation are recognized risks. Existing systems already provide temporal invalidation, shared blocks, namespaces, metadata, and lifecycle management:

- Zep
- Bedrock AgentCore Memory
- Couchbase Agent Memory
- Letta
- traditional MDM, policy, knowledge-graph, catalog, and workflow products

The remaining differentiator is deterministic human authorization, atomic canonicalization, downstream decision lineage, and revocation blast radius.

## Projected rubric

| Criterion | Score |
|---|---:|
| Agentic Memory Design | 7.5/10 |
| Technical Implementation | 0.5/10 |
| Real-World Impact | 6.5/10 |
| Production Readiness | 1/10 |
| Creativity & Originality | 6/10 |
| **Current projected total** | **21.5/50** |

Plausible ceiling: **39–41/50**.

## Critical technical point

Serializable transactions cannot detect semantic contradiction. The application must assign conflicting claims to a deterministic conflict scope/key before CockroachDB can enforce exactly one active canonical claim.

The other fundamental objection is source authority: refund policy should ordinarily remain canonical in its policy/commerce system. The ledger must authorize what claims may influence agent decisions and record lineage—not become a stale second source of truth.

## Decisive demo

- Two agents concurrently submit contradictory evidence-backed refund-policy claims.
- One authorized review transaction changes canonical state and supersedes the old claim.
- The downstream agent changes its decision and cites provenance.
- Source revocation makes the claim unavailable and reveals affected run/output IDs.
- Event propagation uses an outbox/idempotent consumer rather than a fragile database/EventBridge dual write.

## Verdict

**Narrow, 84% confidence.** Strong transactional fit, but too much ontology, governance, workflow, and propagation scope for the available time.

---

# 4. Context release control plane

## Narrowed product

> GitOps-style atomic releases for the stable context prefix shared by a Bedrock agent fleet, with exact lineage and measured cache economics.

## Evidence and alternatives

Bedrock confirms that repeated stable prefixes can reduce token cost/latency and that early prefix changes invalidate later cache reuse. Existing overlaps include:

- Bedrock Prompt Management
- LangSmith prompt management
- MLflow Prompt Registry
- ContextNest
- ACDP
- LMCache / Knowledge Delivery Network

The residual novelty is atomic multi-artifact publication, deterministic Bedrock compilation, active consumer enforcement, invocation reconstruction, and cache-economic measurement.

## Projected rubric

| Criterion | Score |
|---|---:|
| Agentic Memory Design | 6.5/10 |
| Technical Implementation | 0/10 |
| Real-World Impact | 5.5/10 |
| Production Readiness | 0/10 |
| Creativity & Originality | 4/10 |
| **Current projected total** | **16/50** |

Potential after strong proof: high 30s.

## Corrections

- The application cannot delete a Bedrock provider-side prompt-cache entry. It can reject new use of an old release while the provider entry expires by TTL.
- Vector-selected task context should appear after the stable cache checkpoint. Otherwise dynamic retrieval fragments the prefix whose reuse is being optimized.
- EventBridge is notification, not the correctness boundary. Every request must synchronously verify release eligibility.

## Verdict

**Narrow and keep, 84% confidence.** Technically interesting, but at risk of appearing to be a prompt registry plus billing dashboard.

---

# 5. Human-managed shared memory

## Narrowed product

> A governed promotion plane where only authorized, evidence-backed operational learning crosses agent boundaries.

## Evidence and alternatives

Persistent memory poisoning, leakage, and context bloat are credible. The general product category is already served by:

- Bedrock AgentCore Memory
- Mem0
- Zep
- Letta
- Glean

The possible wedge is candidate outcome → evidence → human review → scoped approval → compact capsule → downstream behavioral proof.

## Projected rubric

| Criterion | Score |
|---|---:|
| Agentic Memory Design | 7/10 |
| Technical Implementation | 0/10 |
| Real-World Impact | 5/10 |
| Production Readiness | 2/10 |
| Creativity & Originality | 5/10 |
| **Current projected total** | **19/50** |

Realistic strong-build ceiling: approximately **38/50**.

## Central risk

The human memory inbox may not scale. A useful test must show that a large candidate stream reduces to a small, high-value review queue with acceptable review time and without discarding action-changing memories.

## Verdict

**Narrow, 78% confidence.** Do not build generic shared memory; prove governed cross-agent learning in one high-consequence workflow.

---

# 6. Cross-machine agent chat

## Narrowed product

> A CockroachDB-backed coordination ledger for heterogeneous agents performing cross-repository releases.

## Evidence and alternatives

Coordination pain exists, but the product is crowded by:

- Claude Code Agent Teams
- Agent Room
- agentchattr
- agent-peers-mcp
- MCP Agent Mail
- GitHub and Slack

Agent Room is particularly close to the proposed room, tasks, decisions, presence, project memory, and multi-machine workflow.

## Projected rubric

| Criterion | Score |
|---|---:|
| Agentic Memory Design | 4/10 |
| Technical Implementation | 0/10 |
| Real-World Impact | 4/10 |
| Production Readiness | 0/10 |
| Creativity & Originality | 2/10 |
| **Current projected total** | **10/50** |

Plausible ceiling after narrowing and proof: **35–39/50**.

## Surviving wedge

- exactly-one task ownership;
- recoverable leases;
- evidence-gated completion;
- cross-repository dependencies;
- durable late joining;
- deterministic replay after gateway/session failure.

The demo must have two agents race for the **same** task. Merely showing two terminals exchanging messages proves nothing new.

## Verdict

**Narrow, 87% confidence.** Chat should be the presentation layer, not the product.

---

# 7. Verified incident memory

## Narrowed product

> A transactional safety-and-learning memory for operational agents, centered on negative actions, scoped approvals, idempotency, and independent verification.

## Evidence and alternatives

Incident investigation is a real, expensive workflow. Originality is the problem. Similar patterns already exist in:

- Google SRE's agentic AI work
- AWS observability-agent patterns
- Rootly AI SRE
- Datadog Bits/Incident AI
- PagerDuty Advance

## Projected rubric

| Criterion | Score |
|---|---:|
| Agentic Memory Design | 6/10 |
| Technical Implementation | 0/10 |
| Real-World Impact | 6/10 |
| Production Readiness | 0/10 |
| Creativity & Originality | 1/10 |
| **Current projected total** | **13/50** |

A sharply narrowed, well-proven build could reach the high 30s.

## Surviving wedge

- failed or harmful actions are first-class memories;
- approval is bound to action hash, resource, environment, approver, expiry, and preconditions;
- duplicate remediation is transactionally prevented;
- no outcome becomes verified without independent health evidence;
- stale and superseded outcomes are excluded from retrieval.

## Verdict

**Narrow, 92% confidence.** High impact, but currently too close to well-funded and first-party AIOps systems.

---

# 8. Selective auto-compaction

## Narrowed product

> Claude Code-only reversible and auditable compaction whose exact-source restoration changes a consequential coding action.

## Evidence and alternatives

Context pressure and detail loss are real. Claude Code, Codex, and GitHub Copilot already compact. Close alternatives include:

- native client compaction/checkpoints;
- Context Mode;
- Volt;
- LangGraph/LangMem memory management.

Volt and Context Mode substantially overlap immutable events, summaries, provenance, snapshots, restoration, and off-context retrieval.

## Projected rubric

| Criterion | Score |
|---|---:|
| Agentic Memory Design | 8/10 |
| Technical Implementation | 6/10 |
| Real-World Impact | 6/10 |
| Production Readiness | 4/10 |
| Creativity & Originality | 3/10 |
| **Evaluator's projected potential** | **27/50** |

This judge used a more prospective calibration than other evaluators. The qualitative result remains weak because originality, CockroachDB necessity, AWS necessity, and client intervention are all problematic.

## Decisive demo

- Bury a consequential constraint among large tool results.
- Compact it out of active context.
- Ask the agent to perform work that would violate the constraint.
- Retrieve the exact raw block through CockroachDB with provenance.
- Show the agent changing the code action because of retrieval.

The main technical risk is modifying or injecting into live client context through supported public surfaces without corrupting sessions. Narrowing to Claude Code lowers this risk; Codex support should not be promised without verification.

## Verdict

**Narrow, 88% confidence.** Useful problem, but a poor CockroachDB showcase for a single-developer workload and heavily encroached by native/client tooling.

---

# Cross-candidate conclusions

## What repeatedly failed

- Generic shared memory is crowded.
- Generic chat is already shipped.
- Generic incident response is mature.
- Prompt caching alone is a provider/gateway feature.
- Versioning, provenance, and vector search are not novel by themselves.
- Adding CockroachDB to an otherwise complete architecture does not make it central.
- Adding human approval does not automatically create product readiness.
- A planned multi-region architecture does not prove the workload needs distributed SQL.

## What remains promising

The strongest recurring mechanism is:

> Transactionally bind a consequential agent decision to a coherent, authorized, replayable version of the memory/context that informed it.

This highlights agent-specific properties that traditional applications and generic RAG often miss:

- model context is ephemeral;
- retrieval may be nondeterministic;
- permissions can change after a decision;
- multiple agents can consume different versions concurrently;
- provenance must survive source changes;
- revocation and supersession need explicit semantics;
- exact historical reconstruction is necessary for audit and debugging.

## Next gate

Before broad implementation, create the smallest prototype that falsifies or supports the context-receipt thesis:

1. one source type;
2. two roles;
3. one task;
4. one policy supersession;
5. immutable context blocks;
6. one atomic manifest transaction;
7. one vector candidate query followed by deterministic authorization;
8. one thin client adapter plus a second minimal client path;
9. one receipt/replay view;
10. adversarial tests for unauthorized, stale, and mixed-version context.

Do not expand to general enterprise connectors, live-session revocation, an ontology editor, or a universal policy language until this gate passes.

# Sources surfaced by independent evaluators

## Context and governance

- Anthropic context engineering: https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents
- Less Context, Better Agents: https://arxiv.org/abs/2606.10209
- Microsoft connector permissions: https://learn.microsoft.com/en-us/microsoft-365/copilot/connectors/manage-access-permissions
- Microsoft Semantic Index: https://learn.microsoft.com/en-us/microsoftsearch/semantic-index-for-copilot
- Salesforce enterprise agent governance: https://engineering.salesforce.com/building-an-enterprise-agent-platform-enforcing-identity-data-and-api-governance/
- OWASP excessive agency: https://genai.owasp.org/llmrisk/llm062025-excessive-agency/
- Microsoft agentic memory safety: https://learn.microsoft.com/en-us/security/zero-trust/sfi/manage-agentic-memory-safety
- ContextNest: https://arxiv.org/abs/2607.02116

## Memory competitors

- Zep concepts: https://help.getzep.com/concepts
- Bedrock AgentCore memory metadata: https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/long-term-memory-metadata.html
- Bedrock AgentCore memory namespaces: https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/specify-long-term-memory-organization.html
- Letta memory blocks: https://docs.letta.com/guides/core-concepts/memory/memory-blocks
- Mem0 organizations/projects: https://docs.mem0.ai/api-reference/organizations-projects
- Glean memory: https://docs.glean.com/agents/concepts/memory

## Prompt caching and releases

- Bedrock prompt caching: https://docs.aws.amazon.com/bedrock/latest/userguide/prompt-caching.html
- Bedrock runtime metrics: https://docs.aws.amazon.com/bedrock/latest/userguide/monitoring-runtime-metrics.html
- Bedrock Prompt Management: https://docs.aws.amazon.com/bedrock/latest/userguide/prompt-management.html
- MLflow Prompt Registry: https://mlflow.org/docs/latest/genai/prompt-registry/create-and-edit-prompts/
- LMCache: https://docs.lmcache.ai/
- ACDP: https://www.agentcontextdistributionprotocol.io/spec/retrieval

## Agent coordination

- Claude Code Agent Teams: https://code.claude.com/docs/en/agent-teams
- Codex shared-workspace request: https://github.com/openai/codex/issues/21027
- Agent Room: https://github.com/agent-room-alkl/agent-room
- agentchattr: https://github.com/bcurts/agentchattr
- agent-peers-mcp: https://github.com/tanusuke11/agent-peers-mcp
- MCP Agent Mail: https://github.com/Dicklesworthstone/mcp_agent_mail

## Context compaction

- Claude Code operation and context: https://code.claude.com/docs/en/how-claude-code-works
- Claude Code hooks: https://code.claude.com/docs/en/hooks
- GitHub Copilot CLI context management: https://docs.github.com/en/copilot/concepts/agents/copilot-cli/context-management
- Codex agent-loop compaction: https://openai.com/index/unrolling-the-codex-agent-loop/
- Context Mode: https://github.com/mksglu/context-mode
- Volt: https://github.com/Martian-Engineering/volt

## Incident response

- Google SRE agentic AI: https://cloud.google.com/blog/products/devops-sre/how-google-sre-is-using-agentic-ai-to-improve-operations/
- AWS observability agent: https://aws.amazon.com/blogs/big-data/reduce-mean-time-to-resolution-with-an-observability-agent/
- BMW/AWS incident analysis: https://aws.amazon.com/blogs/machine-learning/innovating-at-speed-bmws-generative-ai-solution-for-cloud-incident-analysis/
- Rootly AI SRE: https://rootly.com/ai-sre
- Datadog Incident AI: https://docs.datadoghq.com/incident_response/incident_management/investigate/incident_ai/

## Agent cost

- AWS Agentic AI cost principles: https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/cost-optimization-design-principles.html
- Portkey gateway: https://portkey.ai/docs/product/ai-gateway
- LiteLLM: https://docs.litellm.ai/
- Langfuse: https://langfuse.com/docs
- Helicone caching: https://docs.helicone.ai/features/advanced-usage/caching
- Bedrock intelligent routing: https://docs.aws.amazon.com/bedrock/latest/userguide/prompt-routing.html

## CockroachDB

- Managed MCP Server: https://www.cockroachlabs.com/docs/cockroachcloud/connect-to-the-cockroachdb-cloud-mcp-server
- Transaction layer: https://www.cockroachlabs.com/docs/stable/architecture/transaction-layer/
- Serializable demonstration: https://www.cockroachlabs.com/docs/stable/demo-serializable
- Transaction retry reference: https://www.cockroachlabs.com/docs/stable/transaction-retry-error-reference
- Vector support: https://www.cockroachlabs.com/docs/stable/vector
- Distributed vector indexing: https://www.cockroachlabs.com/blog/distributed-vector-indexing-cockroachdb/
