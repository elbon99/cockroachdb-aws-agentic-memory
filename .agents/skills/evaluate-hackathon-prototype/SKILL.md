---
name: evaluate-hackathon-prototype
description: Independently evaluate a CockroachDB x AWS hackathon candidate at either idea stage or prototype stage using fresh, context-isolated skeptical subagents and the official judging criteria. Use when comparing ideas before implementation, deciding whether to prototype an idea, reviewing a concept brief, or judging a runnable vertical slice, proof of concept, or demo. Report projected potential for ideas and demonstrated evidence for prototypes; never conflate the two.
---

# Evaluate Hackathon Candidate

Run an unbiased decision gate without leaking prior advocacy or intended conclusions into evaluators.

## Choose the mode

- Use **Idea mode** when no inspectable implementation exists. Evaluate whether the idea deserves a prototype.
- Use **Prototype mode** when source code or a runnable vertical slice exists. Evaluate what has actually been demonstrated.
- If comparing multiple ideas, run one isolated evaluator per idea. Do not give one evaluator competing ideas because relative framing can distort independent scores.

Read [references/judging-brief.md](references/judging-brief.md) completely before either mode.

## Idea mode

1. Create a neutral idea card containing only:
   - problem and precise user;
   - proposed agent workflow;
   - proposed CockroachDB memory role;
   - intended CockroachDB tools;
   - intended AWS role;
   - proposed three-minute demo moment;
   - explicit assumptions and unknowns.
2. Do not include endorsements, previous rankings, debate history, expected scores, competitor conclusions, or language such as "strong," "winning," or "novel."
3. Spawn a fresh subagent with `fork_turns: "none"` for each idea. Pass only:
   - the exact judging brief;
   - that idea's neutral card;
   - the Idea-mode task below.
4. Require the evaluator to open the official URLs and research current comparable products, open-source projects, papers, and recent forum evidence. Prefer primary sources and direct links.
5. Score **projected judging potential**, not achieved implementation. Label every score as projected.

### Idea-mode task

```text
Act as a skeptical independent product and hackathon judge. You have not participated in this idea's development.

Candidate idea:
<neutral idea card>

Official references and judging criteria:
<verbatim judging-brief.md>

Open the official references. Research current comparable implementations and recent evidence that the stated user problem exists. Prefer primary sources and direct links. Distinguish verified facts from inference.

Return:
1. Problem evidence: strong, moderate, weak, or contradicted, with links.
2. Closest alternatives and what remains meaningfully differentiated.
3. A projected 0-10 score for each of the five equally weighted judging criteria.
4. Projected total out of 50, clearly labelled as potential rather than earned score.
5. For each criterion: why the idea could earn the score and what must be implemented or demonstrated to earn it.
6. CockroachDB necessity test: remove CockroachDB from the design and explain what breaks. Flag decorative usage.
7. AWS necessity test: remove AWS from the design and explain what breaks. Flag decorative usage.
8. Three-minute demo test: describe the single visible moment that proves memory changed agent behavior. Fail the test if none exists.
9. Build-risk estimate for a solo hackathon: low, medium, high, or unrealistic, with the riskiest dependency.
10. The strongest argument against building this idea.
11. Three falsification tests to run in a minimal prototype.
12. Keep, narrow, pivot, or kill recommendation with confidence.

Be adversarial but evidence-based. Do not award implementation or production-readiness credit for plans. Score their credible potential and explicitly state the proof still required.
```

## Prototype mode

1. Identify the prototype root and confirm inspectable implementation evidence exists.
2. Spawn exactly one fresh subagent with `fork_turns: "none"`. Pass only:
   - the exact judging brief;
   - the prototype root path;
   - the Prototype-mode task below.
3. Do not include conversation history, product pitch, previous research conclusions, expected scores, suspected weaknesses, or preferred fixes.
4. Tell the evaluator not to read repository ideation, research, project-direction, open-question, or judging-strategy documents.

### Prototype-mode task

```text
Act as a skeptical independent hackathon judge. You have not participated in this project's ideation.

Prototype root: <absolute path>

Official references and judging criteria:
<verbatim judging-brief.md>

Independently inspect and, where safe, run the prototype. Do not read ideation, research, project-direction, open-question, or judging-strategy documents. Judge demonstrated behavior and implementation evidence, not README claims. Open the official URLs and resolve discrepancies in favor of the current official pages.

For originality, research current comparable implementations and cite direct links. Prefer primary sources. Do not assume combining existing components is novel.

Return:
1. Baseline eligibility: pass, fail, or unverified, with evidence.
2. A demonstrated 0-10 score for each of the five equally weighted criteria.
3. Demonstrated total out of 50.
4. Evidence supporting each score and the exact missing proof that capped it.
5. The strongest argument that this prototype will not place in the top three.
6. Any place where CockroachDB or AWS is decorative rather than load-bearing.
7. The three highest-leverage changes, ranked by expected score gain versus effort.
8. Keep, narrow, pivot, or kill recommendation.
9. Confidence and checks that could not be completed.

Be adversarial but evidence-based. Do not award readiness, scale, safety, memory quality, or originality for plans that are not implemented or visibly demonstrated.
```

## Integrity rules

- Use one evaluator per candidate and `fork_turns: "none"` in both modes.
- Do not coach evaluators after spawning them.
- Provide follow-up only when an evaluator requests a missing artifact, and provide only that artifact or path.
- Return each verdict faithfully before adding a short cross-candidate synthesis.
- Compare idea-stage candidates by projected potential, evidence strength, differentiation, demoability, and build risk.
- Never compare an idea-stage projected score directly with a prototype-stage demonstrated score.
- Do not mutate a prototype during evaluation.
