# Five high-consequence agent-workflow candidates

Status: **research and independent judging complete; no project selected**

Research date: **2026-08-13**

This document resets the search after rejecting broad agent infrastructure, generic RAG, deterministic allocation dressed up as agents, and marketplace simulations whose user problem is not independently established.

## Selection profile

A candidate belongs in this round only when all of the following are plausible:

1. Several actors or agents make decisions concurrently against changing shared state.
2. The decisions require judgment over messy evidence; an ordinary optimizer cannot do the whole job.
3. A deterministic control plane can enforce the hard safety and allocation rules.
4. Verified outcomes from prior runs can materially improve a later decision.
5. CockroachDB can be both the operational source of truth and the governed memory store.
6. The CockroachDB transaction and memory behavior can be made visible in under three minutes.
7. A solo builder can simulate the environment without pretending the simulation proves real-world adoption.

## Research funnel

The following initially attractive domains were rejected before the final five:

- **Food rescue and surplus allocation:** real impact, but the workflow is dominated by matching, routing, inventory, and scheduling. Existing platforms already make this a crowded deterministic optimization problem.
- **Clinical-trial matching:** high consequence and document-heavy, but heavily populated by commercial and open-source matching products. Patient safety and evidence requirements are also too large for a short build.
- **AI SRE and incident response:** strong historical-memory story, but an exceptionally crowded agent category and weak CockroachDB necessity at demo scale.
- **Insurance claims and AML investigation:** large markets and useful public datasets, but mature rules engines, graph systems, case-management tools, and agent products leave little original surface for a short prototype.
- **Hospital patient-flow optimization:** important, yet predominantly a constrained scheduling problem with high integration and safety burden.

The five candidates below survived because each contains both an uncertain evidence problem and a hard shared-state problem. None has yet passed the final falsification gate.

## Comparison at a glance

| Candidate | Messy judgment performed by agents | Deterministic safety kernel | Memory that could change a later action | Main weakness |
|---|---|---|---|---|
| Distributed virtual self-driving lab | Interpret results and propose the next experiment | Reagent, budget, instrument, and slot reservations | Provenance-linked negative and failed experiments | Strong autonomous-lab prior art; credible science simulator is hard |
| Regional drug-shortage allocation | Interpret notices, policy, substitutions, and local precedents | Pharmacist-authored eligibility and priority rules plus atomic inventory reservations | Governed local substitution outcomes | Existing hospital shortage products; clinical and adoption risk |
| Food-recall containment | Resolve product, supplier, lot, and location aliases from messy records | Exact lot graph, holds, releases, and idempotent notifications | Human-verified aliases and prior investigation evidence | Missing source data dominates; agents cannot infer unrecorded supply-chain edges |
| Industrial fleet maintenance | Diagnose anomalies from sensors, manuals, and work-order notes | Safety rules plus atomic crew, part, and window reservations | Repair effectiveness for comparable failure signatures | Predictive maintenance and scheduling are mature; LLM may be cosmetic |
| Second-life EV-battery triage | Interpret heterogeneous passports, telemetry, and test reports | Safety thresholds plus atomic bay, order, and processing-capacity reservations | Downstream test, yield, and field outcomes from similar packs | Sparse public outcome labels; deterministic health models may be sufficient |

---

## 1. Distributed virtual self-driving laboratory

### Product sentence

Several research agents propose materials experiments in parallel, while a transactional laboratory memory prevents duplicate use of scarce equipment and lets later agents reuse exact, provenance-linked negative results.

### User and workflow

The first user is a materials-research team running a virtual autonomous lab. Hypothesis agents propose experiments against a shared inventory, instrument calendar, and budget. A deterministic scheduler validates feasibility and reserves resources. A simulator executes accepted experiments. Every input, reservation, result, failure, and derivation becomes an immutable experiment episode.

Agents are useful only for the scientific judgment layer: interpreting results, relating semantically similar experiments, and proposing the next candidate. They must not own reservation correctness or safety constraints.

### CockroachDB fit

- Serializable transaction for reagent decrement, instrument slot, budget reservation, experiment state, and outbox event.
- Immutable experiment lineage, result provenance, idempotency keys, leases, and worker fencing.
- Structured and vector retrieval over prior experiments, especially negative results that are not exact duplicates.
- Read-limited Managed MCP for agents to inspect eligible evidence; scoped service transactions for mutations.

### Decisive demo

Two agents request overlapping reagent and one instrument slot. One transaction wins and the other replans. In a second round, retrieval of a related failed experiment causes an agent to avoid a redundant candidate and reach the target in fewer simulated experiments than the same scheduler without episodic recall.

### Evidence and prior art

- [Argonne Polybot](https://cnm.anl.gov/pages/polybot) and the [NIST Autonomous Formulation Laboratory](https://www.aps.anl.gov/APS-Events/2025-02-03/the-autonomous-formulation-laboratory-saxssans-ai-driven-discovery-for) show that autonomous materials laboratories are real.
- [A distributed self-driving laboratory](https://www.nature.com/articles/s41467-023-44599-9) already connected robots in Cambridge and Singapore through a shared dynamic knowledge graph. This is the strongest warning against claiming distributed laboratories or shared scientific knowledge as novel.
- [OCTOPUS](https://www.nature.com/articles/s41467-024-54067-7), FINALES, AlabOS, ChemOS, and HELAO already address substantial portions of workflow orchestration, scheduling, and experiment management.
- [AutoLabs](https://github.com/pnnl/autolabs) already uses multiple LLM agents for experimental protocol generation.
- A recent physical-action stress test reported that only 3.3% of proposed trials were executable overall, with the best system at 28.1%. The [preprint](https://arxiv.org/abs/2607.23045) is useful evidence for reliability risk, but not proof of demand for this product.

### Independent skeptical verdict

**Narrow, 85% confidence.** The evaluator's projected completed-MVP ceiling was **33/50**: memory 8, implementation 7, impact 6.5, readiness 5, originality 6.5. Those are possible points, not earned points.

The defensible wedge is narrower than a distributed-lab operating system:

> A transactional experiment-memory and reservation layer that prevents concurrent autonomous materials agents from double-spending scarce lab resources and lets them reuse provenance-linked negative results.

Solo-build risk was rated **9/10**. The largest risk is creating a scientifically defensible response surface; a hand-authored simulator can make the memory advantage look staged. The strongest falsification test is an agent-versus-asynchronous-constrained-Bayesian-optimization benchmark with the same scheduler. If agents do not reduce experiments-to-target by a meaningful margin, the agent layer is redundant.

---

## 2. Regional hospital drug-shortage allocation

### Product sentence

Hospital agents turn shortage notices and pharmacist-approved policy into explainable demand proposals, while an auditable transaction layer allocates scarce stock across facilities without double-promising it and recalls governed local substitution outcomes.

### User and workflow

The first user is a drug-shortage pharmacist for a small multi-facility health system. Agents summarize current notices, normalize local demand, retrieve applicable local precedents, and propose substitutions. A deterministic allocation cycle ranks demand using pharmacist-authored eligibility and priority rules before atomically creating reservations. The model cannot approve treatment or directly reserve inventory.

### CockroachDB fit

- Current inventory, demand intents, formulary/policy versions, approvals, allocations, transfers, and idempotency in relational state.
- Serializable reservations across facilities, with explicit retry handling.
- Governed episode memory linking prior substitution, context, human approval, and verified outcome.
- Vector search only after hard filtering by drug, service line, policy version, evidence state, and synthetic clinical constraints.

### Decisive demo

Three facilities request six remaining units. A deterministic policy ranks the constrained request first and safely assigns alternatives to the others in randomized concurrent runs. Separately, a prior pharmacist-approved failure changes one lower-priority substitution recommendation relative to the same rules-only baseline. A pharmacist approval is the only action that creates an executable plan.

### Evidence and prior art

- The [FDA 2025 shortage report](https://www.fda.gov/media/193637/download?attachment=) recorded 93 ongoing FDA-tracked shortages at year end and explains that shortages can delay care or force riskier second-line alternatives.
- [ASHP statistics](https://www.ashp.org/drug-shortages/shortage-resources/drug-shortages-statistics) reported 227 active shortages in June 2026. FDA and ASHP use different definitions, so these figures must not be combined.
- An [ASHP survey](https://www.ashp.org/-/media/assets/drug-shortages/docs/ASHP-2023-Drug-Shortages-Survey-Report.pdf) found shortages reported by more than 99% of 1,123 respondents; a later ASHP hospital survey reported that large hospitals spent up to 66 staff-hours per week mitigating shortages.
- [ASHP guidance](https://academic.oup.com/ajhp/article/75/21/1742/5160014) explicitly recommends shortage teams, allocation committees, historical usage, prioritization, centralized inventory, and inter-facility sharing.
- Existing products—OrbitalRX/OrbitalAI, Bluesight ShortageCheck, BD HealthSight, and QuicksortRx—already cover system-wide inventory, shortage coordination, alternatives, forecasting, transfers, and knowledge workflows. The broad product category is occupied.
- [openFDA exposes a daily JSON shortage API](https://open.fda.gov/apis/drug/drugshortages/), but warns against relying on it for medical-care decisions.

### Independent skeptical verdict

**Narrow, 88% confidence.** Current evidence score: **16/50** because nothing is implemented; credible tightly built ceiling: approximately **32/50**. Current criterion scores were memory 6, implementation 0, impact 7, readiness 0, originality 3.

The only defensible wedge is:

> An auditable shortage-allocation safety kernel combining pharmacist-approved policy, atomic reservations, and constrained retrieval of locally observed precedents.

Solo-build risk was rated **9/10**. The exact concurrent double-promising problem and the availability of useful causal outcome labels remain unverified. The product should be falsified if interviews with shortage pharmacists show that existing software already handles the collision/precedent workflow, or if governed memory fails to improve blinded pharmacist-reviewed cases over policy rules alone.

---

## 3. Food-recall containment across a trading network

### Product sentence

Evidence agents resolve messy product and location records into proposed traceability links, while an exact transactional graph places auditable lot holds and reuses only human-verified aliases from earlier recalls.

### User and workflow

The first user is a recall coordinator for one manufacturer and its connected distributors and retailers. Agents read recall notices, shipping records, labels, and supplier documents to propose entity and lot matches with citations. Deterministic graph traversal defines the affected scope. High-confidence links still require policy validation or human approval before a hold is issued.

This is not an agent inventing supply-chain edges. Its useful role is narrowing messy evidence into reviewable candidate links.

### CockroachDB fit

- Exact event and lot genealogy, aliases, locations, shipments, holds, releases, notification state, and idempotency.
- Transactions keep hold/release and audit events consistent under concurrent investigation.
- Embeddings retrieve prior evidence and aliases, but never determine containment scope by themselves.
- Provenance connects every proposed match to a source record and reviewer decision.

### Decisive demo

A recall notice uses an unfamiliar product alias. A previous human-verified alias lets the agent find the correct lot path faster, then the exact graph places holds. Simultaneous hold/release actions resolve to one auditable state. The fair baseline uses robust conventional entity resolution—not a deliberately naive exact-string matcher.

### Evidence and prior art

- The [FDA Food Traceability Rule](https://www.fda.gov/food/food-safety-modernization-act-fsma/fsma-final-rule-requirements-additional-traceability-records-certain-foods) and [traceability lot-code guidance](https://www.fda.gov/food/food-safety-modernization-act-fsma/traceability-lot-code) establish the importance of exact traceability records.
- FDA stated in December 2025 that recalled infant formula was still found for sale at more than 175 locations across 36 states after more than 4,000 retail checks. [FDA recall-compliance announcement](https://www.fda.gov/food/recalls-outbreaks-emergencies/fda-calls-food-industry-leaders-strengthen-recall-compliance-and-ensure-recall-effectiveness)
- A frozen supplemental-shake investigation involved 38 cases, 37 hospitalizations, and 11 deaths. [FDA investigation](https://www.fda.gov/food/outbreaks-foodborne-illness/outbreak-investigation-listeria-monocytogenes-frozen-supplemental-shakes-february-2025)
- [openFDA food-enforcement data](https://open.fda.gov/apis/food/enforcement/) supplies useful real recall notices, but not a private company's lot genealogy. The connected trading network must therefore be simulated.
- FoodLogiQ/Trustwell, SAP Global Batch Traceability, TraceGains, and GS1 EPCIS already address traceability, recall management, and event standards.

### Independent skeptical verdict

**Narrow, 90% confidence.** The evaluator scored current evidence at **21/50**—memory 7, implementation 0, impact 8, readiness 0, originality 6—and estimated that a polished implementation might reach approximately **40/50**. This evaluator intentionally withheld all unimplemented technical/readiness credit, so its current total is not directly comparable to potential-only scores.

The useful wedge is an evidence-backed recall-scope copilot for one manufacturer's connected network, not a general food-safety platform. Solo-build risk was rated **9.5/10**. The strongest argument against it is that missing and non-interoperable records are the dominant failure; no agent can reconstruct a supply-chain edge that was never captured. Bad fuzzy matches can also contaminate future memory.

---

## 4. Industrial fleet maintenance coordination

### Product sentence

Asset agents interpret anomalies and past work-order outcomes, while a transactional maintenance controller reserves scarce crews, parts, and downtime windows without collisions.

### User and workflow

The first user is an operations lead for a multi-site wind-turbine or industrial fleet. Asset-scoped agents combine sensor anomalies, manuals, and unstructured work-order notes to propose diagnoses and work. A deterministic validator enforces safety and eligibility, and a scheduler reserves a qualified crew, spare part, and maintenance window. Human approval remains mandatory for high-impact work.

### CockroachDB fit

- Asset state, anomaly references, work orders, parts balances, crew certifications/availability, reservations, approvals, and repair outcomes.
- Serializable transactions for parts, crew, and window allocation; leases and idempotency for workers.
- Hybrid recall over comparable failure signatures and prior repair effectiveness.
- Provenance and supersession when diagnoses or manuals change.

### Decisive demo

Three turbine agents compete for one bearing and one qualified crew. A prior verified episode shows that the obvious repair did not resolve a comparable symptom, changing one agent's proposal or priority. The same deterministic scheduler without episodic recall repeats the ineffective repair or misranks the case. CockroachDB separately proves that the part and crew cannot be double-booked.

### Evidence and prior art

- AWS already publishes a [generative-AI predictive-maintenance agent architecture](https://aws.amazon.com/blogs/industries/enhance-predictive-maintenance-with-generative-ai-agents-on-aws/) and a [hybrid-AI maintenance-planning workflow](https://aws.amazon.com/blogs/industries/reduce-pid-analysis-time-by-80-with-hybrid-ai-maintenance-planning/). These validate the workflow but weaken originality.
- NASA's [C-MAPSS datasets](https://c3.ndc.nasa.gov/dashlink/resources/139/) and [data paper](https://ntrs.nasa.gov/citations/20205001125) provide credible engine-degradation data for simulation, but not the rich work-order notes required for the proposed memory story.
- A recent [LLM predictive-maintenance survey](https://www.mdpi.com/2076-3417/15/21/11515) shows a rapidly growing research category.
- CMMS, asset-performance-management, prognostics, job-shop scheduling, and multi-agent reinforcement-learning systems already solve major pieces of this problem. The burden is to prove that retrieved episodic evidence improves a nontrivial judgment beyond structured failure statistics.

### Independent skeptical verdict

**Narrow, 88% confidence.** Current evidence score: **12/50**; credible polished-MVP ceiling: **34/50**. Current criterion scores were memory 4, implementation 0, impact 3, readiness 2, and originality 3. The evaluator rated the broad maintenance problem 8/10 but the proposed semantic-outcome-memory mechanism only 2/10.

The remaining wedge is outcome- and supersession-aware repair memory coupled to a transactionally consistent shared-resource coordinator. Solo-build risk was rated **8/10**. The decisive blocker is a credible linked anomaly-to-repair-to-outcome dataset: C-MAPSS does not contain it, and hand-authored notes could make any retrieval method appear to win. The agent version must beat a strong CMMS baseline using exact failure code, asset model, recency, and structured outcomes—not a no-history strawman.

---

## 5. Second-life EV-battery triage

### Product sentence

Battery agents turn heterogeneous pack histories into evidence-backed reuse, test, recycle, or quarantine proposals while a transactional facility controller allocates limited diagnostic and processing capacity.

### User and workflow

The first user is an operations lead at a battery recycler or second-life facility. Pack-scoped agents interpret battery passports, telemetry, service history, and test reports. They retrieve verified outcomes for comparable packs and propose a route: second-life application, additional diagnostic testing, recycling, or hazard quarantine. Deterministic safety thresholds and a human approval gate are authoritative.

### CockroachDB fit

- Pack identities/passports, state-of-health estimates and confidence, document/telemetry references, decisions, approvals, reservations, and downstream outcomes.
- Serializable allocation of diagnostic bays, repacking capacity, recycling capacity, and limited second-life orders.
- Governed episodic memory over test yield, repack success, and downstream performance, with provenance and supersession.
- Hybrid structured/vector retrieval over heterogeneous reports; read-limited MCP for recall.

### Decisive demo

Several pack agents contend for one diagnostic bay and a limited second-life order. One pack passes a simple state-of-health threshold but retrieves a prior bad outcome for a comparable thermal signature, so the agent proposes additional testing rather than immediately consuming the order. Another pack fills the capacity. The fair baseline retains the same thresholds and allocator but has no episodic outcome retrieval.

### Evidence and prior art

- NASA publishes a [Randomized and Recommissioned Battery Dataset](https://data.nasa.gov/dataset/randomized-and-recommissioned-battery-dataset), while [Battery Archive](https://batteryarchive.org/) aggregates public battery-aging datasets.
- A 2026 [Nature Reviews Clean Technology review](https://www.nature.com/articles/s44359-026-00167-0) reports that many retired EV batteries retain roughly 70–80% capacity and highlights heterogeneous, unreliable retirement-condition data as an obstacle to reuse decisions.
- The European Commission states that an EV-battery passport becomes mandatory from 18 February 2027. [EU battery-passport page](https://single-market-economy.ec.europa.eu/single-market/digital-product-passport/batteries_en)
- Existing work includes [CeLLife battery diagnostics](https://www.cellife.fi/industries/recycling), Fraunhofer's [RoB@t2Cell](https://www.iwks.fraunhofer.de/en/projects/current-projects/robat2cell.html), and Altilium's [ReGenTrace platform](https://altilium.tech/2026/07/21/altilium-to-deploy-regentrace-ai-platform-to-accelerate-scale-up-of-uk-ev-battery-materials-supply-chain/). These make broad “AI battery triage” claims unsafe.

### Independent skeptical verdict

**Narrow, 86% confidence.** Current evidence score: **10/50**; credible transparent-synthetic-data ceiling: **33/50**. Current criterion scores were memory 4, implementation 0, impact 4, readiness 0, and originality 2.

CeLLife, ReGenTrace, DEXOLYTA, and RoB@t2Cell already cover much of AI intake triage, traceability, routing, and outcome learning. The remaining distinction is inspectable analog-episode recall plus atomic facility-capacity reservation in one system. Solo-build risk was rated **9/10**. The decisive blocker is a credible labeled intake-to-route-to-downstream-outcome corpus; NASA and Battery Archive do not supply that chain. The fair baseline is a tuned structured classifier using all available chemistry, age, voltage, thermal, and service fields plus the same optimizer and safety rules.

---

## Cross-candidate architecture rule

Every surviving idea has the same safe boundary:

```text
unstructured evidence -> agent proposal -> deterministic validation
                     -> serializable reservation/commit -> human or simulator outcome
                     -> governed episodic memory -> later agent proposal
```

The agent interprets evidence and proposes. It does not own balances, capacity, eligibility, safety policy, or approval. Vector retrieval generates candidates; structured filters and exact current state remain authoritative.

## Provisional conclusions

1. **Impact alone is not enough.** Drug shortages and food recalls have the strongest evidence of harm, but their regulatory burden, existing products, and missing-data constraints can overwhelm the agent-memory story.
2. **The laboratory is the purest agentic-memory concept.** Failed experiments naturally become reusable episodic memory, but autonomous-lab orchestration has strong prior art and a believable simulator is difficult.
3. **Industrial maintenance is easy to understand but crowded.** It has good datasets and a visible contention demo, yet a prognostics model plus conventional scheduler may be the honest solution.
4. **Battery triage may offer the freshest visual/product story.** It combines documents, sensor evidence, scarce facility capacity, sustainability, and a near-term passport catalyst. Its decisive weakness is the scarcity of validated, labeled downstream outcomes.
5. **No candidate should be selected from pitch quality alone.** The next gate is a small data-and-baseline spike proving that memory changes a defensible decision beyond structured statistics.

## Research ranking

This ranking balances natural agent-memory fit, verified pain, originality, CockroachDB relevance, and the probability of completing an honest demo. It is not a judge score.

| Rank | Candidate | Why it ranks here | Judge evidence / ceiling | Solo risk |
|---:|---|---|---|---:|
| 1 | Distributed virtual self-driving lab | Negative experiments are the most natural episodic memory in the set, and experiment/resource races make the transaction story coherent | Moderate problem evidence; 33/50 completed-MVP ceiling | 9/10 |
| 2 | Food-recall containment | Strongest verified public impact and a very legible evidence-to-hold demo | 21/50 current; approximately 40/50 polished ceiling | 9.5/10 |
| 3 | Regional drug-shortage allocation | Strong operational evidence and the cleanest scarce-stock invariant | 16/50 current; approximately 32/50 narrow ceiling | 9/10 |
| 4 | Industrial fleet maintenance | Large established workflow and understandable UI, but the specific memory value and novelty are weak | 12/50 current; 34/50 polished ceiling | 8/10 |
| 5 | Second-life EV-battery triage | Visually fresh and timely, but near-copy competitors and missing outcome data substantially weaken it | 10/50 current; 33/50 transparent-synthetic ceiling | 9/10 |

The ceiling figures are not directly comparable because independent evaluators used slightly different evidence conventions. They are retained faithfully and should not be treated as a mathematical leaderboard.

### Present recommendation

Take only the top two into a short falsification spike:

- **Laboratory:** can governed negative-result memory beat an asynchronous constrained Bayesian-optimization baseline on experiments-to-target?
- **Food recall:** can verified episodic aliases beat robust entity resolution on held-out cases without increasing false holds?

If neither passes, do not build a polished UI around them. The research did not uncover a low-risk, uncontested domain where agents, vector memory, CockroachDB distribution, and AWS are all independently necessary.

## Next decision gate

Before implementation, run the following for the top two candidates:

1. Build a 30–100 episode fixture from public data plus clearly labeled synthetic operational records.
2. Define a strong non-agent baseline: deterministic scheduler plus structured statistics or a conventional domain model.
3. Pre-register the outcome metric and the one circumstance where episodic retrieval should help.
4. Test no memory vs structured memory vs hybrid/vector memory.
5. Reject the candidate if vector/episodic recall does not improve the decision or if an LLM agent is not necessary.
6. Run concurrent reservation and idempotency property tests separately; do not conflate database correctness with memory quality.
7. Interview at least three plausible users or domain practitioners before making a market claim.
