# Open questions

> Superseded as the active decision list on 2026-08-13 when FillFleet was dropped as the selected direction. Retained as a record of that candidate. See [HIGH_CONSEQUENCE_WORKFLOW_IDEAS_2026-08-13.md](HIGH_CONSEQUENCE_WORKFLOW_IDEAS_2026-08-13.md) for the current candidate set and decision gate.

These questions remain unresolved after selecting FillFleet for skeptical evaluation and vertical-slice design on 2026-08-13.

## User and problem

- Is the initial user an enterprise AI platform team, procurement innovation team, or marketplace operator?
- Is digital-capacity procurement a credible initial workflow or only an attractive simulation?
- Which resource makes the problem most immediately legible: GPU-minutes, API credits, inference tokens, or specialist-agent capacity?
- Does the product remain useful if suppliers expose fixed prices rather than supporting auctions or negotiation?
- What real procurement failure best corresponds to the forced duplicate-reservation race?

## Demo market

- What deterministic price and capacity schedule creates a compelling but reproducible market?
- How many suppliers and agents are enough to demonstrate parallelism without visual noise?
- Which supplier should fail, by how much, and at what point in the demo?
- Should the first mission deliberately choose the cheapest supplier before outcome memory exists?
- What exact historical outcome should cause a different second allocation?
- Is surplus resale necessary for the core story, or should it remain an optional extension?

## Procurement semantics

- How is one large requirement decomposed into uniquely identifiable demand lots?
- Can a reservation span several lots, or must each hold bind to exactly one lot?
- What makes a quote comparable across suppliers?
- Which constraints are hard requirements versus scored preferences?
- How are partial fills, expired holds, cancellations, and supplier withdrawal represented?
- When is an order considered complete: ordered, paid, delivered, or verified?
- What constitutes a successful unit for cost-per-success memory?

## Transactions and failure behavior

- What exact rows must be committed in the capacity-and-budget reservation transaction?
- Which conflict and idempotency keys guarantee one logical order and payment?
- How will client code handle CockroachDB serialization retries?
- What happens when an order succeeds but the response is lost before persistence?
- How are expired reservations reclaimed safely?
- How does the verifier distinguish delayed delivery from failed delivery?
- What reconciliation process repairs mock-payment and order-state disagreement?
- Which fault injection most clearly proves production-minded engineering?

## Memory and retrieval

- What fields define similarity between procurement missions?
- How many seeded outcomes are needed for vector retrieval to be credible?
- What baseline should vector retrieval beat: cheapest price, weighted SQL score, or structured supplier averages?
- How are observations, hypotheses, orders, and verified outcomes separated?
- Which evidence makes an outcome eligible for future recall?
- How are outdated supplier outcomes decayed or superseded?
- How do hard filters prevent semantically similar but inapplicable outcomes from influencing an award?
- What metric proves that recall improved expected or actual fulfillment rather than merely changing the explanation?

## Managed MCP

- Which approved views should agents query through the Managed MCP Server?
- Can the demo visibly show MCP recall without turning into a database-chat sidebar?
- How will agent identity and mission scope constrain MCP reads?
- Which mutations must remain behind scoped application tools?
- How will MCP audit logs contribute to the decision receipt?

## AWS

- Which Bedrock model is reliable and inexpensive for structured offer comparison?
- Should the agent runtime use Lambda, ECS, or a local process for the first vertical slice?
- Which AWS component is actually load-bearing rather than decorative?
- What deterministic fallback preserves the demo if Bedrock is unavailable?
- Which CloudWatch metrics are most valuable: conflicts, retries, tool latency, completion time, or cost?

## Payment

- Is a CockroachDB-backed mock wallet sufficient for the hackathon story?
- Does Stripe test mode add visible value or distract from the memory and concurrency proof?
- What is the exact state machine for authorized, reserved, paid, reversed, and reconciled funds?
- How will duplicate `pay_order` calls prove idempotency?

## Evaluation

- What concurrency test proves zero overbuying and zero overspending?
- How many repeated trials are enough to support the invariant claim?
- What outcome metric should drive selection: completion rate, cost per successful unit, deadline success, or a composite?
- What non-vector baseline provides the fairest comparison?
- How will we prove that the second mission changed because of retrieved memory rather than a hardcoded branch?
- Can ordinary PostgreSQL reproduce the decisive demo without losing any relevant guarantee?

## Interface and submission

- What working title is most memorable: FillFleet, ProcureQuest, LotRush, or another name?
- What is the single main screen: marketplace board, mission progress, or agent race?
- How are searches, reservations, conflicts, orders, payments, and deliveries shown without overwhelming the viewer?
- What visual makes the CockroachDB transaction win unmistakable?
- What visual makes the vector-memory recall unmistakable?
- Can the complete story fit under three minutes without accelerated or misleading behavior?
