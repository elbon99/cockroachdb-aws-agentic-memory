# Parallel evidence memory: dataset-driven exploration

Date: **2026-08-13**

Status: **candidate exploration, not selected direction**

## Core idea

Build a shared evidence ledger for agents that analyze different document shards in parallel.

Each worker:

1. claims a unique shard;
2. extracts typed findings and exact evidence spans;
3. searches shared memory for related findings;
4. supports, contradicts, refines, or supersedes an existing hypothesis;
5. publishes only evidence-linked memory;
6. releases its work lease.

A synthesis agent reasons over the shared ledger rather than receiving every source document or every worker transcript.

## Product thesis

> Parallel agents should share verified findings, not raw conversations.

The project should prove that a shared evidence ledger reduces duplicate work, preserves provenance, controls context growth, and improves conclusions that require evidence from several independent shards.

## Why an agent is needed

The input must contain unstructured narrative, implicit causality, inconsistent terminology, or cross-document relationships. If all inputs are clean structured fields, ordinary batch processing and SQL are sufficient.

Agents perform:

- narrative interpretation;
- entity and event normalization;
- causal or contractual claim extraction;
- contradiction discovery;
- evidence-bound explanation;
- adaptive follow-up retrieval.

Deterministic services perform:

- task leases and exactly-once shard claims;
- schemas and validation;
- deduplication keys;
- lifecycle transitions;
- authorization and tenancy;
- evidence-span checks;
- concurrency control and retries.

## Candidate datasets

| Dataset | Agent need | Evaluation signal | Demo value | Main limitation |
|---|---:|---:|---:|---|
| NASA ASRS aviation narratives | High | Expert analyst synopsis and coded factors | High | Voluntary reports are not verified ground truth |
| NTSB aviation investigations | High | Official factual narrative and probable cause | High | Larger and more complex records; incident-analysis category overlap |
| Enron email corpus | High | Some threading and entity-disambiguation gold sets | Very high | Harder to establish a clean end-task benchmark; sensitive real-person interpretation |
| CUAD legal contracts | High | 13,000+ expert labels across 510 contracts and 41 clause types | Medium-high | Contract extraction is crowded and legal claims require careful framing |
| CFPB complaints | Medium-high | Product/issue labels and company responses | High | Consumer narratives are expressly unverified and not representative samples |
| HotpotQA | Medium | Exact answer and supporting-fact metrics | Medium | Excellent benchmark, weak standalone real-world product story |

## Recommended domain demo

### Aviation near-miss pattern discovery using NASA ASRS

NASA ASRS provides de-identified narrative reports, optional callback information, expert analyst synopses, coded event characteristics, human factors, and contributing factors. It also publishes topic-specific report sets containing 50 prescreened records, which is convenient for a bounded prototype.

Proposed user: an aviation safety analyst screening large volumes of voluntary near-miss reports.

Proposed task:

> Identify recurring combinations of conditions that create an operational hazard, link every hypothesis to exact reports, and use the accumulated pattern memory to assess a new report.

Example pattern:

```text
unstable approach
+ fatigue
+ late runway reassignment
→ repeated go-around or runway-incursion risk
```

One report may not establish the pattern. Several agents processing independent reports can contribute supporting or contradicting evidence to the same hypothesis.

Important framing: the system assists screening and pattern discovery. It does not determine accident cause or replace safety investigators.

## Strong alternative

### Enron evidence reconstruction

Agents process different employee mailboxes or time windows and build a shared, citation-backed timeline of decisions, commitments, contradictions, and entity aliases.

This creates a memorable e-discovery interface and a genuine cross-shard reasoning task. It is riskier because end-task ground truth is weaker, alias/thread normalization is complex, and conclusions about real people require especially careful evidence handling.

## Evaluation dataset

Use a small HotpotQA subset only as a system benchmark if schedule permits. HotpotQA provides gold answers and sentence-level supporting facts for questions requiring evidence from multiple documents.

It can measure:

- answer exact match/F1;
- supporting-fact precision/recall;
- duplicate worker steps;
- tokens placed in shared memory;
- tokens consumed by the synthesis agent;
- wall-clock completion time.

HotpotQA should validate the memory mechanism, not become the product story.

## Memory model

### Private worker memory

- assigned shard;
- local notes;
- intermediate hypotheses;
- failed extraction attempts.

### Shared candidate memory

- normalized claim;
- claim type and scope;
- source document and exact evidence span;
- author agent and run ID;
- confidence and extraction metadata;
- semantic embedding;
- status: proposed, corroborated, contradicted, rejected, superseded;
- links to supporting and contradicting findings.

### Compact active memory

- currently supported hypotheses;
- unresolved contradictions;
- evidence coverage;
- open questions;
- provenance pointers to raw sources.

Raw documents and verbose agent traces should remain outside the active context. CockroachDB stores structured memory and embeddings; S3 may store bulky source artifacts.

## CockroachDB role

CockroachDB should hold:

- work items, ownership leases, attempts, and checkpoints;
- documents and source metadata;
- extracted entities, events, findings, and evidence spans;
- embeddings for related-finding retrieval;
- hypothesis support and contradiction edges;
- memory admission and lifecycle state;
- synthesis runs and consumed-memory receipts;
- evaluation outcomes and audit events.

Serializable transactions enforce:

```text
one active owner per work item
one idempotent result per worker attempt
no active claim without source evidence
atomic claim + evidence + relationship publication
one coherent lifecycle transition per hypothesis
```

Distributed Vector Indexing finds semantically related findings across shards. Structured filters enforce domain, time, entity, status, source type, and evidence eligibility.

Managed MCP provides agents a constrained recall and inspection path over approved findings, unresolved contradictions, work state, and citations.

## Proposed agent fleet

- **Dispatcher:** creates shard tasks and leases them exactly once.
- **Evidence workers:** interpret independent narratives and submit typed findings.
- **Memory curator:** deduplicates, links, and proposes lifecycle changes.
- **Skeptic/verifier:** searches for contradicting evidence and validates citations.
- **Synthesizer:** produces the final pattern report using active shared memory only.

The fleet should contain three to five concurrent workers, not dozens of LLM instances.

## Decisive demo

1. Ask a question whose answer requires evidence from several reports.
2. Launch four workers over separate report shards.
3. Show each worker claim a unique lease.
4. Two workers independently find related evidence and race to update the same hypothesis.
5. CockroachDB merges their provenance without losing or duplicating either contribution.
6. A skeptic adds contradictory or limiting evidence.
7. The synthesis agent retrieves the compact hypothesis rather than every transcript.
8. Show exact source spans behind the conclusion.
9. Compare against isolated workers: duplicated work, larger context, or incomplete conclusion.

The memory-changing moment is:

> A late worker retrieves an existing hypothesis, searches specifically for corroboration or contradiction, and changes the final confidence or scope using evidence from its own shard.

## Baselines

Compare:

1. single agent with all documents;
2. parallel isolated agents followed by transcript concatenation;
3. parallel agents with naive shared append-only memory;
4. parallel agents with selective evidence-ledger memory.

Measure:

- conclusion accuracy or label agreement;
- supporting-evidence precision and recall;
- provenance completeness;
- duplicate processing;
- shared-memory size;
- synthesis-context tokens;
- total model calls and latency;
- contradiction detection.

## Existing overlap

This is not an empty research space.

- Learning to Share proposes a learned global memory bank for parallel agent teams and reports reduced redundant work on AssistantBench and GAIA.
- emem provides content-addressed, verifiable shared memory for agents.
- research and open-source systems already explore structured evidence ledgers, provenance-constrained reasoning, shared memory, and multi-agent literature synthesis.

The defensible distinction must therefore be demonstrated as:

> Transactional, evidence-gated memory where concurrent agents can safely converge on support, contradiction, and supersession relationships, with exact citations and measurable context savings.

Generic shared memory or parallel document summarization is not novel.

## Feasibility

Feasible vertical slice:

- one ASRS topic report set;
- 30 to 50 narratives;
- four workers;
- three finding types;
- one hypothesis lifecycle;
- one vector index;
- one conflict/merge race;
- one synthesis screen;
- one isolated-versus-shared comparison.

Avoid:

- training a learned memory controller;
- processing an entire national corpus;
- a general agent framework;
- a knowledge graph UI;
- autonomous safety recommendations;
- many model providers;
- complex ontology design;
- real-time ingestion.

## Recommendation

This direction is more feasible than FillFleet because it removes payment, marketplace, allocation, and fulfillment simulation. It also gives agents a legitimate unstructured interpretation task.

The central risk is originality: parallel shared memory and evidence ledgers already exist in research and open source. The project should proceed only if its transactional convergence and measurable evidence-quality improvement remain visually clear.

## Competitive reality check

This is not a greenfield product category.

Existing aviation systems already cover much of the user outcome:

- FAA ASIAS aggregates aviation safety data to identify emerging hazards, support risk analysis, and develop predictive capabilities.
- NASA ASRS already uses experienced analysts to review reports, identify hazards, classify events, diagnose contributing factors, and issue alerts to relevant authorities.
- TrustFlight Centrik uses AI to find similar events and hazards, suggest categories, and detect recurring findings.
- FlightAtom describes supported text analysis for clustering and categorizing reports and weak-signal detection.
- Other commercial aviation safety-management products offer automated report classification, trend forecasting, evidence tracking, and AI-assisted investigation workflows.

Existing memory systems also cover much of the proposed technical mechanism:

- emem implements content-addressed, verifiable shared memory, provenance, temporal edges, contradiction preservation, and live memory events.
- MASE requires mechanically verifiable evidence spans and retains rejected hypotheses.
- MemClaw formalizes scoped retrieval, temporal supersession, provenance, and governed propagation for fleet memory.
- StateFuse and related work preserve concurrent contradictions and immutable correction history.
- Learning to Share studies selective global memory for parallel agent teams.

No single public implementation found in this review clearly combines all of the following in an ASRS demonstration: CockroachDB-transactional parallel work claiming, evidence-span admission, evolving shared hypotheses, contradiction-aware retrieval, and a controlled isolated-agents baseline. That is still a technically coherent hackathon composition, but it is an integration novelty rather than a new market category.

The project should not claim to invent aviation hazard detection, evidence ledgers, or shared multi-agent memory. A defensible claim would be narrower: demonstrating that a transactionally governed evidence memory improves the accuracy, provenance, and context efficiency of parallel narrative analysis under concurrent updates.

## Primary sources

- NASA ASRS Database Online: https://asrsdbol.arc.nasa.gov/
- NASA ASRS topic report sets: https://asrs.arc.nasa.gov/search/reportsets.html
- NTSB aviation datasets: https://www.ntsb.gov/Pages/AviationQueryHelp.aspx/1000
- Enron corpus: https://www.cs.cmu.edu/~enron/
- Enron threading/entity datasets: https://www.cs.cmu.edu/~einat/datasets.html
- CUAD: https://github.com/The-Atticus-Project/cuad
- CFPB Consumer Complaint Database: https://www.consumerfinance.gov/data-research/consumer-complaints/
- HotpotQA: https://hotpotqa.github.io/
- Learning to Share: https://arxiv.org/abs/2602.05965
- emem: https://github.com/Vortx-AI/emem
- FAA ASIAS: https://www.faa.gov/about/plansreports/aviation-safety-information-analysis-and-sharing-asias
- NASA ASRS report processing: https://asrs.arc.nasa.gov/overview/report.html
- TrustFlight Centrik Smart Suggestions: https://www.trustflight.com/products/centrik-5-qms/smart-suggestions/
- FlightAtom Safety: https://www.flightatom.com/products/safety.html
- MASE agent memory: https://github.com/zbl1998-sdjn/MASE-agent-memory
- Governed Shared Memory / MemClaw: https://arxiv.org/abs/2606.24535
- StateFuse: https://arxiv.org/abs/2607.05844
