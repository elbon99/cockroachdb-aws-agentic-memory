# Agent file consistency and awareness: candidate exploration

Date: **2026-08-13**

Status: **promising candidate, not selected direction**

## Proposed problem statement

Parallel agents can be isolated from direct file clobbering, but they still make decisions from stale file versions, duplicate reads and work, produce semantically incompatible changes across files, and lose file-scoped knowledge across compaction and handoffs. Git records completed versions; it does not provide a live coordination and memory contract for agents operating before merge.

## Evidence that the problem is genuine

- Claude Code's official agent-view documentation states that sessions sharing a working directory can conflict and moves editing sessions into worktrees.
- Claude Code and Codex both ship native worktree support specifically for parallel agent isolation.
- Cursor background agents use separate clones and branches; GitHub Copilot exposes agent-assisted conflict resolution.
- Recent user reports describe agents overwriting files, deleting tests, coding against stale interfaces, reacting to another agent's incomplete build, and producing changes that merge textually but fail semantically.
- A recent Codex issue describes a production pattern of worktrees, explicit owned-file scopes, merge preflight, and a serialized merge queue. This is strong evidence for the operational problem and for the incumbent solution.

The evidence is strongest for teams running several coding agents concurrently. It is not evidence that every coding-agent user needs a new platform.

## What existing tools solve

### Git branches and worktrees

They prevent agents from mutating the same physical checkout. They preserve version history and expose textual merge conflicts.

They do not ensure that:

- an agent knows another branch changed an interface it depends on;
- two clean diffs are behaviorally compatible;
- work is not duplicated across agents;
- a read is still current when a write is attempted;
- a later agent receives a prior agent's file-specific warning or rationale;
- merge order respects dependencies;
- an agent's compacted session remembers why a file mattered.

### File locks and ownership scopes

They reduce collisions by assigning paths to agents. They are useful but coarse: cross-file contracts and generated files make path ownership incomplete, and hard locks can unnecessarily serialize independent changes.

### Pull requests and CI

They detect many failures after work is complete. They are primarily integration-time controls, not live awareness or context delivery.

### Collaborative editing algorithms

Operational transformation and CRDTs merge concurrent character or document operations. They do not decide whether two code changes are semantically compatible or what contextual warning an agent should receive.

## The sharper product

Do not build "Git for agents."

Build an **agent-aware concurrency and memory layer for mutable artifacts**.

Every agent file operation passes through a hook or MCP/filesystem adapter that attaches a version contract:

1. `read(path)` records the content hash, repository revision, branch/worktree, agent, purpose, and relevant file notes.
2. `intend_write(path, base_hash, intent)` registers a short-lived edit intent and checks overlapping work.
3. `write(path, expected_hash, patch)` succeeds only when the expected version contract is valid in that workspace; otherwise it is rejected and the agent receives the intervening diff and relevant notes.
4. `publish_change(...)` atomically records the new artifact version, affected symbols/contracts, rationale, tests, dependencies, and an event.
5. Other agents subscribed to the file, symbol, contract, or dependency receive a compact invalidation notice.
6. After context compaction or handoff, a reread returns current content plus durable, scoped knowledge: warnings, decisions, pending edits, superseded notes, and dependency changes.

The core invariant is not "only one agent may edit a file." It is:

> No agent may silently publish a change based on a version that has become invalid, and no relevant artifact change should remain invisible to dependent agents.

## Consistency through the layers

### 1. Filesystem layer

- Preserve normal files and native agent tools.
- Hooks intercept reads, edits, writes, deletes, moves, and generated-file commands where supported.
- Hash content before and after mutation.
- Use atomic replacement for whole-file writes.

### 2. Workspace and Git layer

- Give each agent a branch/worktree for physical isolation.
- Identify an artifact version by repository, path, branch, commit/base revision, and content hash.
- Retain normal Git commits and diffs as the canonical source history.
- Use a dependency-aware merge queue rather than allowing concurrent integration.

### 3. Coordination layer in CockroachDB

Suggested records:

- `agents` and `sessions`
- `workspaces` and `branches`
- `artifacts`
- `artifact_versions`
- `read_receipts`
- `edit_intents` with leases/TTL
- `change_events`
- `artifact_dependencies`
- `file_notes` with scope and supersession
- `merge_candidates` and dependency edges
- `delivery_receipts`

Serializable transactions atomically validate an expected version, publish a new version/event, update dependencies, and retire an edit intent. Idempotency keys make hook retries safe. Expiring leases handle crashed agents.

### 4. Awareness/event layer

- CockroachDB CDC/changefeeds publish artifact events to a webhook or AWS event processor.
- An AWS Lambda can route compact invalidations to subscribed live sessions and record delivery receipts.
- Hooks inject relevant notices at the next safe agent boundary rather than editing private transcript files.
- Urgent conflicts can block a write; non-urgent changes become a compact message.

### 5. Memory layer

File notes are structured and version-scoped, not arbitrary sticky notes. A note contains:

- artifact or symbol scope;
- originating version and evidence;
- author/agent identity;
- note type: constraint, rationale, warning, dependency, TODO, test result;
- validity interval or superseding note;
- visibility policy;
- confidence/verification status.

Retrieval first uses exact artifact/symbol/version filters. Embeddings are secondary, for finding related decisions or semantically affected artifacts. This avoids decorative vector search.

### 6. Integration layer

- Before merge, detect textual conflicts with Git.
- Detect dependency and contract invalidations using changed symbols, schemas, API descriptions, tests, or agent-produced claims.
- A resolver agent receives both diffs, their base versions, intents, notes, and test evidence.
- The merge result and resolution rationale become another versioned event.

## Concrete demonstration

Use three agents in separate worktrees:

- Agent A changes an API response schema.
- Agent B, based on the old schema, updates a frontend consumer in a different file. The Git merge is textually clean but semantically wrong.
- Agent C starts work on the same consumer after compaction.

Show:

1. A and B read their files and receive version tokens.
2. A publishes the schema change and a file/symbol-scoped contract note.
3. CockroachDB atomically stores the new version, dependency event, and note.
4. B receives an invalidation before publishing, retrieves A's exact diff/rationale, and revises its code.
5. C rereads the consumer and receives the current file plus the surviving scoped note without replaying either transcript.
6. A deliberately stale write is rejected using its expected hash/version.
7. The coordinated run passes an integration test; an uncoordinated baseline produces a clean merge that fails.

This demonstrates more than a dashboard: shared memory changes agent behavior before integration failure.

## Debate

### Argument for building

- The problem is documented by vendors and current users.
- Native products solve physical edit collision through isolation, validating the problem but leaving a coordination gap.
- Stale reads and semantic conflicts are distributed-systems problems, which gives CockroachDB a meaningful transactional role.
- File-scoped durable notes connect consistency with agentic memory instead of bolting on generic RAG.
- A deterministic demo can show a clean Git merge fail in the baseline and succeed with live invalidation.
- The initial prototype can be narrow: one repository, Claude Code hooks, three agents, a few operations, and one contract-change scenario.

### Strongest argument against building

- Worktrees, strict task decomposition, file ownership, merge queues, and CI already solve most practical pain cheaply.
- Coding-agent vendors are rapidly adding native worktree and multi-agent coordination features.
- Hooks differ by client and cannot reliably intercept every mutation performed through shell commands, build tools, formatters, or generators.
- Git remains the source of truth; copying file contents and histories into CockroachDB would be redundant and create consistency risk.
- "File notes" may become noisy, stale context that agents learn to ignore.
- Semantic dependency detection is difficult and could turn the prototype into an unreliable static-analysis platform.
- For a single developer with three agents, SQLite plus Git hooks may reproduce most of the demo, weakening CockroachDB necessity.

### Rebuttal and boundary

The direction survives only if it avoids duplicating Git and focuses on pre-merge coordination metadata:

- store hashes, events, leases, notes, dependency claims, and receipts—not every full file blob;
- use Git/object storage for full content and diffs;
- make stale-write rejection deterministic;
- make note relevance scoped and version-aware;
- demonstrate concurrent agents or machines where a local lock file/SQLite database is insufficient;
- show a semantic conflict across different files, because same-file merge conflicts are already obvious.

## Hackathon fit

- **Agentic Memory Design:** strong if notes, dependency changes, read receipts, and prior rationales alter later actions.
- **Technical Implementation:** strong if serializable validation, expiring leases, idempotency, CDC, MCP/hook integration, and failure recovery are visible.
- **Real-World Impact:** credible but initially limited to teams running multiple coding agents.
- **Production Readiness:** requires tenant/repository isolation, redaction, least privilege, event delivery semantics, graceful hook failure, and Git reconciliation.
- **Creativity:** moderate. Worktrees/orchestration are crowded; version-aware file memory and live semantic invalidation are the differentiator.

CockroachDB is justified more naturally for agents operating across machines and clients. For one local repository, its necessity remains vulnerable.

## Falsification tests

1. **Worktree substitute:** If worktrees + owned paths + serialized merge queue prevent the chosen failure without the memory layer, reject the scenario.
2. **Behavior test:** Plant contract changes across non-overlapping files. Require the coordinated agent to adapt before merge while the baseline misses a meaningful share.
3. **Context test:** After compaction, measure whether scoped notes reduce reread/tool tokens without causing more stale-note mistakes.
4. **Hook coverage:** Exercise edits via direct write, patch, shell redirection, formatter, generator, rename, and delete. Narrow claims to intercepted paths if coverage is incomplete.
5. **Database substitute:** Compare CockroachDB with a lock file/SQLite implementation. If distributed concurrency, recovery, or event delivery provides no visible gain, the sponsor fit is decorative.

## Current assessment

This is a genuine and more technically coherent problem than generic transcript memory. The broad same-file-overwrite framing is already solved by isolation. The promising problem statement is stale artifact awareness and durable, version-scoped knowledge across concurrent agents and context loss.

Recommendation: **NARROW AND TEST**, not yet select.

## Sources

- Claude Code agent view: https://code.claude.com/docs/en/agent-view
- Claude Code worktrees: https://code.claude.com/docs/en/worktrees
- Claude Code agent teams: https://code.claude.com/docs/en/agent-teams
- OpenAI Codex app/worktrees: https://openai.com/index/introducing-the-codex-app/
- Cursor background agents: https://docs.cursor.com/background-agent
- GitHub Copilot fleet: https://docs.github.com/en/copilot/concepts/agents/copilot-cli/fleet
- GitHub Copilot conflict resolution: https://docs.github.com/en/copilot/how-tos/use-copilot-agents/cloud-agent/use-cloud-agent-on-github
- Codex concurrent-change issue: https://github.com/openai/codex/issues/16195
- Claude Code worktree context issue: https://github.com/anthropics/claude-code/issues/28041
- Recent user report, parallel Claude sessions: https://www.reddit.com/r/ClaudeCode/comments/1ru3i4q/how_i_run_56_claude_code_agents_in_parallel/
- Recent user discussion, semantic staleness: https://www.reddit.com/r/codex/comments/1seb0wd/swarming_question/
- Recent mixed-fleet report: https://www.reddit.com/r/AI_Agents/comments/1uq8euy/lessons_from_months_of_running_a_mixed_fleet_of/
- CockroachDB transaction layer: https://www.cockroachlabs.com/docs/stable/architecture/transaction-layer/
- CockroachDB changefeeds: https://www.cockroachlabs.com/docs/stable/create-changefeed
- CockroachDB webhook sinks: https://www.cockroachlabs.com/docs/stable/changefeed-sinks
