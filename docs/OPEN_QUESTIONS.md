# Open questions

These are deliberately unresolved.

## Product

- Is incident response the strongest problem, or is there a better domain where durable memory has higher novelty/impact?
- Who is the precise user?
- What is the single expensive decision the agent improves?
- What does the agent do, rather than merely recommend?

## Memory semantics

- What is a memory unit?
- Which memories are structured vs embedded?
- How is provenance stored?
- How is confidence represented?
- How does a memory become “verified”?
- Can memory be invalidated/superseded?
- Do we need decay/recency scoring?
- How do we prevent one bad agent outcome poisoning future behavior?
- How do we separate event history from distilled learned memory?

## Agent architecture

- Single agent with explicit workflow vs multiple specialized agents?
- What is deterministic code vs model reasoning?
- What decisions require a human gate?
- What happens after rejection?
- What happens if an action partially succeeds?
- How do retries remain idempotent?

## CockroachDB

- Which two required tools create the strongest technical story?
- Exact vector indexing schema/query approach?
- MCP access model and permissions?
- Do we use ccloud CLI meaningfully?
- What observability/audit evidence can be shown in the demo?

## AWS

- Bedrock vs another model path?
- ECS vs Lambda for runtime?
- Minimum deployment architecture that remains credible?
- Cost/free-tier constraints through judging?

## Evaluation

- What are the “no-action” traps?
- What incorrect historical memory should the system learn to ignore?
- How do we test retrieval quality?
- How do we prove the second incident is improved because of memory?
- What metrics can be shown honestly in the demo?

## Submission

- What is the first 20 seconds of the demo?
- What CockroachDB screen/query makes memory visually undeniable?
- What deterministic fallback keeps the demo reproducible?
- What architecture diagram can be understood in <15 seconds?
