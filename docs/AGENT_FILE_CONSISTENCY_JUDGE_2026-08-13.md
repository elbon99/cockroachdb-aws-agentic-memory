# Independent judge: agent file consistency idea

Date: **2026-08-13**

Mode: **Idea mode**

Status: **Independent context-isolated evaluation**

## Independent judge assessment

### 1. Problem evidence: **Moderate**

The failure mechanism is well supported; the size and urgency of the market are not yet proven.

Verified facts:

- Anthropic's official agent-team guidance says coordination overhead and conflicts increase with more teammates, recommends avoiding same-file conflicts, and acknowledges limitations in task state and session resumption. It also confirms that agents have independent context windows and do not inherit the lead's conversation history. [Claude Code agent teams](https://code.claude.com/docs/en/agent-teams)
- Anthropic now automatically moves editing sessions into isolated worktrees because concurrent sessions sharing a directory can conflict. That validates physical-isolation demand, but not the proposed semantic-dependency solution. [Claude Code agent view](https://code.claude.com/docs/en/agent-view)
- OpenAI and GitHub both advertise parallel agents through isolated worktrees, demonstrating that the target workflow is real and mainstream. Neither cited product description claims cross-worktree semantic invalidation. [OpenAI Codex app](https://openai.com/index/introducing-the-codex-app/), [GitHub Copilot app](https://docs.github.com/en/copilot/concepts/agents/github-copilot-app)
- The recent CoAgent paper defines the same "stale-view gap": an agent retains an immutable old read in context after another agent mutates shared state. Its measured case study leaves an invalid final state even though agents have disjoint write sets. This is strong evidence for the mechanism behind the proposed API/consumer demo. [CoAgent paper](https://borowiecki.dev/pdf/2606.15376)
- Contract-Coding reports that removing its central contract caused functional success to fall from 100% to 65% on one benchmark and task-existence tracking to fall to 82%. This supports structured cross-agent contract memory, although it is a generation benchmark rather than production developer telemetry. [Contract-Coding paper](https://aclanthology.org/2026.findings-acl.400.pdf)
- A real open-source product, MCP Agent Mail, explicitly targets agents overwriting edits, missing parallel-workstream context, and requiring human relays. Its existence validates demand but also weakens originality. [MCP Agent Mail](https://github.com/Dicklesworthstone/mcp_agent_mail_rust)

Inference:

- There is credible evidence that stale reads and coordination failures exist.
- There is not yet strong evidence that typical teams running three or more agents suffer enough cross-file semantic failures to accept blocking hooks, leases, latency, and another distributed service. No prevalence, time-loss, or willingness-to-pay data was supplied.

### 2. Closest alternatives

1. **CoAgent — closest technical prior art**

   It applies concurrency control at tool-call boundaries specifically to close stale agent views. This is uncomfortably close to the core insight. The candidate remains differentiated by Git-native artifact lineage, contract/symbol dependencies, version-scoped rationale, and durable handoff memory, but it cannot claim the broad idea of "MVCC for agents" as novel. [CoAgent](https://borowiecki.dev/pdf/2606.15376)

2. **MCP Agent Mail — closest product/user competitor**

   It already has persistent agent identities, inboxes, acknowledgments, leases/file reservations, pre-commit guards, searchable durable messages, compaction-efficient MCP resources, and SQLite/Git persistence. The meaningful differentiator is automatic expected-version and dependency validation across disjoint files, not messaging or leases. [MCP Agent Mail](https://github.com/Dicklesworthstone/mcp_agent_mail_rust)

3. **Claude Code Agent Teams**

   Shared task lists, dependency-aware task claiming, file locking, direct messaging, and hooks solve task-level coordination. They do not appear to validate that a write was based on the current version of a separately owned contract. [Official docs](https://code.claude.com/docs/en/agent-teams)

4. **Codex/GitHub Copilot worktrees**

   Strong physical isolation and PR/merge workflows, but worktrees preserve stale snapshots by design and textual merge checks do not detect a cleanly mergeable API/consumer mismatch. [Codex](https://openai.com/index/introducing-the-codex-app/), [Copilot](https://docs.github.com/en/copilot/concepts/agents/github-copilot-app)

5. **GitButler parallel branches**

   Handles parallel branch organization and explicit stacking when one task depends on another. Dependency discovery remains manual; it does not supply per-read provenance or reactive invalidation. [GitButler parallel agents](https://docs.gitbutler.com/ai-agents/parallel-agents)

6. **Contract-Coding**

   Uses a central language contract and synchronized commits to coordinate repo-level multi-agent generation. The candidate's remaining distinction is reactive coordination over an existing repository, exact read versions, provenance, and durable notes rather than one generation pipeline. [Paper](https://aclanthology.org/2026.findings-acl.400.pdf)

### 3–5. Projected judging scores

These are **credible potential scores, not earned scores**. There is currently no implementation.

| Criterion | Potential | Why it could earn this | Proof required |
|---|---:|---|---|
| Agentic Memory Design | **8/10** | Memory directly changes whether an agent may publish and supplies exact version-scoped context after handoff. CockroachDB stores operational state, provenance, contracts, leases, and delivery history rather than chat logs alone. | Show atomic expected-version/dependency validation; a durable note recovered by a new session; meaningful multi-session state; cleanup/supersession policy; and why exact SQL plus optional vector retrieval is appropriate. |
| Technical Implementation | **6.5/10** | Serializable transactions and CDC fit the consistency/event problem unusually well. The proposed division between SQL writes and read-only MCP is sensible. | Working schema, transaction retry loop, compare-and-swap logic, idempotency, CDC duplicate handling, authenticated MCP reads, ccloud use, tests under concurrent publication, and reconciliation of Git/DB partial failure. The hackathon requires at least two named CockroachDB tools. [Requirements](https://cockroachdb-ai.devpost.com/) |
| Real-World Impact | **7/10** | Silent semantic conflicts are more dangerous than visible textual conflicts, and parallel-agent usage is becoming a first-class product workflow. | Evidence from at least 10–20 realistic paired tasks showing baseline failures or rework, plus measurable reduction without intolerable false blocks. Demonstrate value beyond a synthetic schema fixture. |
| Production Readiness | **5/10** | The concept anticipates leases, observability, retries, DLQ, provenance, and delivery receipts. | Nothing here is earned by the plan. Must demonstrate tenant/repository isolation, RBAC, secret handling, auditability, lease expiry, retry behavior, CDC duplicates, dead consumers, unavailable DB behavior, bypass detection, latency SLOs, retention, and Git/DB reconciliation. |
| Creativity & Originality | **5.5/10** | Combining artifact MVCC, dependency invalidation, and version-scoped rationale is insightful and well matched to agent context limitations. | Explicit comparison against CoAgent and MCP Agent Mail, with a demo proving cross-file dependency invalidation—not merely leases, mail, or worktrees. Avoid branding the generic concurrency-control insight as wholly new. |

**Projected potential total: 32/50.**

A sharp, working, narrowly scoped demo could outperform that projection. A dashboard over mocked events would score far lower.

### 6. CockroachDB necessity test

Remove CockroachDB and replace it with SQLite plus local hooks:

- For one repository on one laptop, almost nothing essential breaks.
- Expected-hash checks, leases, notes, events, and subscriptions can all be implemented locally.
- MCP Agent Mail already demonstrates much of that model with SQLite/Git.
- Therefore CockroachDB is **decorative for the initial single-machine demo unless its consistency and event properties are visibly exercised**.

What legitimately breaks at production scope:

- Multiple geographically or operationally independent workers lose a highly available shared coordination authority.
- Atomic multi-row validation/publication over versions, dependencies, intent retirement, and event creation becomes harder to operate safely at scale.
- Durable CDC-backed notification processing and globally consistent coordination require additional infrastructure.

CockroachDB's default serializable isolation supports the proposed invariant, but only if the transaction actually reads/checks every relevant version row and the client handles serialization retries. [Transaction architecture](https://www.cockroachlabs.com/docs/stable/architecture/transaction-layer/), [retry requirement](https://www.cockroachlabs.com/docs/stable/begin-transaction)

Critical flaw: Git content and CockroachDB metadata cannot be committed atomically in one transaction. The design needs a state machine such as `prepared → Git commit verified → published`, an outbox/reconciler, and a canonical commit SHA. Otherwise the metadata can say a version exists when the file write failed, or Git can advance without metadata.

CDC is at-least-once, per-key ordered, and neither totally nor transactionally ordered. Lambda must deduplicate by event/idempotency key and must not infer global order from arrival order. [Changefeed guarantees](https://www.cockroachlabs.com/docs/stable/changefeed-messages)

### 7. AWS necessity test

Remove Lambda, CloudWatch, and the queue:

- The core stale-write rejection still works synchronously against CockroachDB.
- A local CDC consumer can deliver invalidations.
- The three-minute demo does not inherently require AWS.

Thus AWS is presently **supporting infrastructure and risks appearing decorative**.

AWS becomes meaningful if the demo visibly shows:

- Lambda consuming a real committed changefeed/webhook event;
- an idempotent subscription decision;
- delivery to a distinct live session;
- a retry or DLQ path; and
- measured end-to-end invalidation latency in CloudWatch.

Even then, the authoritative safety check should remain synchronous before publication. Async Lambda delivery is a usability optimization, not the correctness boundary.

### 8. Three-minute demo test: **Pass, if executed exactly**

The single decisive moment is:

> Agent B's frontend edit is textually clean and targets a different file, but publication is rejected because its recorded read of the API contract is stale. The screen then shows Agent A's exact committed contract diff and scoped rationale arriving from CockroachDB; B changes its implementation, republishes, and the integration test passes.

That proves memory changed behavior. Agent C's post-compaction note retrieval is useful supporting evidence, but should not displace the stale dependency rejection.

The baseline must visibly show that the same uncoordinated branches merge cleanly yet fail the identical test. If B is merely warned by a scripted message, or the dependency is hard-coded solely for the demo without being recorded through the normal workflow, the test fails.

### 9. Solo-hackathon build risk: **High**

The riskiest dependency is not CockroachDB. It is obtaining reliable read/write hook coverage and correctly mapping a frontend write to a separately changed API contract.

Shell redirection, formatters, generators, renames, direct editor writes, `git apply`, and clients without supported hook semantics can bypass the safety boundary. A tool that sometimes blocks stale writes may create dangerous false confidence.

For a solo build, narrow to:

- one supported client;
- TypeScript;
- normal tool-based reads/edits only;
- file and explicitly declared contract dependencies;
- pre-commit/publication enforcement rather than arbitrary filesystem interception;
- no general semantic inference;
- no vector search unless it materially affects the demo.

### 10. Strongest argument against building it

The proposal may be an elaborate distributed solution to a problem better addressed by decomposition, ownership, continuous rebasing, generated client types, contract tests, and a merge queue—and it cannot guarantee correctness because the most important operations can bypass its hooks.

Worse, close alternatives already provide worktrees, task dependencies, messaging, leases, guards, and durable handoffs, while CoAgent covers the fundamental stale-view concurrency insight. Unless dependency-aware cross-file invalidation produces a large empirical improvement with low false-positive friction, this becomes a costly coordination layer that slows agents while still offering incomplete protection.

### 11. Three falsification tests

1. **Does the problem materially occur?**
   Run at least 20 paired API/consumer, schema/migration, config/runtime, and generated-type tasks with three isolated agents. Compare clean-merge integration failures and rework against ordinary worktrees plus CI. Kill or pivot if the baseline failure rate is negligible.

2. **Can the safety boundary be bypassed?**
   Attempt edits through the client edit tool, shell redirection, formatter, code generator, rename, `git apply`, and manual editor. Fail the concept if unsupported writes can reach commit/publication without detection. A pre-commit full-tree reconciliation may be necessary even if individual writes are not intercepted.

3. **Is dependency invalidation useful rather than noisy?**
   Seed known relevant and irrelevant contract changes, then measure detection recall, false-block rate, notification latency, and recovery time. A reasonable prototype gate would be 100% detection on the declared demo dependencies, under 5% irrelevant blocks, and sub-second validation on the supported path.

### 12. Recommendation: **Narrow**, confidence **0.86**

Build the smallest defensible wedge: **optimistic concurrency control for explicitly declared cross-file contracts in one TypeScript repository**, with durable version-scoped rationale.
Do not build a general multi-client semantic dependency platform during the hackathon. Do not lead with leases or agent mail; those are already crowded. Lead with the clean-merge failure that existing worktrees and file locks miss.

The design should only expand after the falsification tests establish that:

- the baseline failure is common enough;
- supported operations cannot silently bypass enforcement; and
- the dependency signal is precise enough that agents accept the blocking behavior.
