# FillFleet idea-stage evaluation

Date: **2026-08-13**

Mode: **Idea evaluation; projected potential, not earned implementation score**

Method: A fresh context-isolated evaluator received only the official hackathon rubric and a neutral idea card. It researched current alternatives and problem evidence without prior rankings or advocacy.

## Verdict

**Narrow, confidence 86%.**

Recommended product:

> A race-safe settlement and outcome-memory layer for autonomous procurement of divisible compute capacity.

Do not position FillFleet as a replacement procurement suite. Use one resource, three deterministic suppliers, one wallet, one forced conflict, one partial fulfillment, and one second-mission allocation change.

## Problem evidence

Assessment: **Moderate**.

Verified:

- procurement teams deal with fragmented vendor information, manual comparison, compliance checks, and supplier selection;
- autonomous sourcing is an existing product category;
- divisible GPU capacity is a genuine purchasing category;
- probabilistic recommendations need deterministic authorization and payment execution.

Not verified:

- enterprises currently launch several independent purchasing agents against the same demand and shared wallet often enough to create a standalone market;
- buyers want a separate coordinator rather than controls inside ERP, sourcing, cloud-broker, or scheduler products;
- duplicate autonomous reservations are an observed widespread production failure rather than a plausible future risk.

## Closest alternatives

| Alternative | Existing overlap | Remaining differentiation to prove |
|---|---|---|
| SAP Ariba Sourcing Assistant | Historical supplier data, bid analysis, risks, explainable awards | Concurrent demand/budget/capacity reservation and loser-retry race |
| Oracle Autonomous Sourcing | Policy-constrained events, suppliers, awards, approvals, purchasing documents | Real-time divisible capacity, idempotency, contention, and shortfall re-sourcing |
| Keelvar | Supplier recommendation, scenario optimization, autonomous sourcing | Outcome memory joined to settlement correctness |
| AWS Smart Procurement Assistant | Bedrock/AgentCore agents, supplier and financial analysis, ERP integration | CockroachDB-backed race-safe settlement and verified fulfillment loop |
| NVIDIA Compute Match | Multi-provider GPU capacity discovery and reservation | Autonomous split allocation, shared-budget control, memory, and recovery |

The novel center is not AI procurement. It is:

> Concurrent, race-safe settlement of divisible demand plus verified-outcome memory that changes a later award.

## Projected judging potential

| Criterion | Projected potential | Required proof |
|---|---:|---|
| Agentic Memory Design | 8.0/10 | Two comparable missions where persisted verified evidence is retrieved and changes an award; retrieval trace and ablation |
| Technical Implementation | 7.0/10 | Real Cloud cluster, vector index, MCP calls, transaction boundaries, constraints, retry handling, and concurrency tests |
| Real-World Impact | 6.0/10 | Validate buyer and frequency; quantify completion, savings, or avoided overcommitment; preferably use realistic traces |
| Production Readiness | 5.5/10 | Authentication, tenancy, secrets, authorization, crash recovery, observability, and load tests |
| Creativity & Originality | 7.5/10 | Independent agents, genuine database conflict, and persisted evidence affecting allocation rather than scripted animation |
| **Projected total** | **34.0/50** | Potential only; incomplete or mostly simulated work could score below 25 |

## CockroachDB necessity test

At hackathon scale, PostgreSQL with serializable transactions, unique constraints, pgvector, and an application API remains a credible substitute.

CockroachDB becomes meaningful if the demo proves all three:

1. genuine concurrent conflicts and retry-safe invariants;
2. vector retrieval over rich mission context adds value beyond supplier aggregates;
3. operational truth, evidence, decisions, reservations, and receipts remain in one consistent system.

Vector search is decorative if memory reduces to supplier reliability, price, region, and delivery ratio. Those belong in structured SQL.

## AWS necessity test

AWS is submission-essential but not architecturally unique. Bedrock must make a bounded schema-validated recommendation that a deterministic allocator checks. CloudWatch should show conflicts, retries, and tool latency if included.

Bedrock must never enforce settlement correctness.

## Decisive demo moment

1. Mission 1 awards substantial capacity to the cheapest supplier.
2. That supplier partially fails.
3. The verifier persists exact failure evidence.
4. Mission 2 has deliberately comparable constraints and offers.
5. The UI shows the retrieved outcome ID and similarity/filter evidence.
6. The allocator materially reduces or eliminates the unreliable supplier.
7. The decision receipt cites the prior verified outcome.

The reservation race proves transactional correctness. The allocation change proves memory.

## Build risk

**High.**

The risky combination is real parallelism, deterministic conflict timing, transaction retries, idempotent settlement, partial-fulfillment recovery, vector retrieval, Bedrock structured output, Managed MCP, AWS deployment, UI, and a sub-three-minute narrative.

The main conceptual risk is that vector retrieval fails to outperform a structured supplier-statistics baseline.

## Strongest argument against building

The project may solve an invented coordination failure in a simulated marketplace. Existing procurement suites already cover supplier history, policy, approvals, bid optimization, and purchasing records. A conventional transaction service plus deterministic optimizer may reproduce the demo without multiple LLM agents, embeddings, or CockroachDB distribution.

## Falsification tests

### 1. Correctness under contention

Launch at least 100 concurrent attempts against the same demand, wallet, capacity, and repeated idempotency keys. Inject worker crashes before and after commit.

Fail if:

- any demand, capacity, or budget invariant breaks;
- a duplicate logical payment appears;
- recovery requires manual database repair.

### 2. Memory-value ablation

Run comparable second missions under:

1. no historical memory;
2. structured supplier statistics only;
3. vector retrieval plus structured filters.

Predefine fulfilled quantity by deadline, cost per successful unit, or regret as the objective. Remove vector memory if it does not improve cases where contextual similarity should matter.

### 3. Buyer validation

Show the workflow to at least five enterprise AI-platform, FinOps, or procurement practitioners.

Fail or reframe the standalone-product thesis if fewer than two report this as current or near-term pain, or if every buyer says the capability belongs inside an existing procurement or cloud-management platform.

## Sources used by the evaluator

- Hackathon overview: https://cockroachdb-ai.devpost.com/
- Official rules: https://cockroachdb-ai.devpost.com/rules
- AWS Smart Procurement Assistant: https://aws.amazon.com/blogs/industries/automate-procurement-workflows-with-ai-agents-using-amazon-bedrock-agentcore/
- SAP Ariba Sourcing Assistant: https://www.sap.com/mena/use-cases/joule-assistant/sourcing-assistant
- Oracle Autonomous Sourcing Assistant: https://docs.oracle.com/en/cloud/saas/readiness/scm/26a/proc26a/26A-procurement-wn-f41767.htm
- Keelvar: https://www.keelvar.com/
- NVIDIA Compute Match: https://computematch.nvidia.com/
- IMF, *How Agentic AI Will Reshape Payments*: https://www.imf.org/en/-/media/files/publications/imf-notes/2026/english/insea2026004.pdf
- CockroachDB transaction architecture: https://www.cockroachlabs.com/docs/stable/architecture/transaction-layer/
- CockroachDB Cloud Managed MCP: https://www.cockroachlabs.com/docs/cockroachcloud/connect-to-the-cockroachdb-cloud-mcp-server
