# ContextSeal validity-aware memory graph

Status: **selected, implemented vertical slice**

Decision date: **2026-08-15**

## Product sentence

> ContextSeal prevents agent fleets from recalling conclusions invalidated by newer Git, file, API, or schema evidence.

## Problem

Persistent agent memory can preserve a confident conclusion while losing the exact program or operational state that established it. Vector retrieval may then return a highly relevant but obsolete memory. Multi-agent work makes the failure harder to observe because one agent can modify an artifact after another agent has derived claims from it.

## Model

Memory is a typed evidence graph:

```text
claim -> evidence -> artifact version -> validity -> dependent claims
```

Artifacts have canonical identity `(repository, path, selector)`. JSON Pointer provides exact sub-file identity in the vertical slice; unstructured files fall back to whole-file identity.

Claims are never overwritten. They transition through `valid`, `stale`, `unprovable`, and `superseded`. Their historical artifact versions remain available for reconstruction and replay.

## Core invariant

```text
A claim is admissible only when every required anchored artifact version is
the current version for the target repository/branch, and every upstream
claim in its derivation path remains valid.
```

Artifact writes use expected-file-hash admission. Version publication, recursive invalidation, and the write audit event share one serializable CockroachDB transaction. Concurrent writes against the same base cannot both succeed.

## Git boundary

ContextSeal checks the remote branch identity before reading worktree status. It may fetch when explicitly enabled but never pulls, merges, or rebases automatically.

- Git is the version authority for committed artifacts.
- ContextSeal receipts provide live coordination between commits.
- Offline or unauthorized remote access yields `remoteFreshness: unknown`, not a fabricated current state.
- Force-push and branch validity are scoped to the target repository/branch rather than globally deleting historical memory.

## Multi-agent audit

Every operation carries `team_id`, `agent_id`, `parent_agent_id`, and `session_id`. Root and subagents receive independent read receipts. A later read returns a compact capsule of intervening writes, their authors, summaries, hashes, and outcomes.

The prototype uses an explicit API/wrapper. It does not claim to intercept every arbitrary shell mutation. Git reconciliation detects bypassed changes at preflight and publication boundaries.

## Retrieval

1. VECTOR similarity finds candidate claims.
2. Relational graph traversal expands evidence and derivation edges.
3. The validity gate separates candidates into `admissible` and `withheld`.
4. The agent receives current claims with exact evidence pointers; obsolete matches remain visible only for audit.

## Sponsor roles

### CockroachDB

- Serializable expected-hash writes and recursive invalidation.
- Relational artifact/claim graph and immutable versions.
- Distributed VECTOR index over memory claims.
- Read-oriented Managed MCP views for validity and multi-agent audits.
- `ccloud` plus migration/seed/stress scripts for reproducible cloud proof.

### AWS

- Bedrock Converse proposes a normalized replacement claim from a bounded artifact diff.
- The application independently verifies its selector, current version, and content hash.
- Real Bedrock usage telemetry is returned; deterministic mode never fabricates it.
- AWS deployment remains a submission task after the live integrations pass.

## Three-minute demo

1. Subagent reads a 30-day refund-window artifact and creates a 14-day eligibility conclusion.
2. Another subagent/remote revision changes only the window to 7 days.
3. CockroachDB appends two changed artifact versions (whole file and selected field), leaves `/currency` unchanged, and invalidates two dependent memories.
4. Recall shows the obsolete eligibility conclusion as a close semantic match but withholds it.
5. Re-verification creates a current 7-day claim and an ineligible-case conclusion while preserving the old graph.
6. A concurrent-write race proves exactly one expected-base winner.

## Scope exclusions before submission

- No universal Claude/Codex transcript or hook support.
- No automatic merge or conflict resolution.
- No static source-code dependency analysis or Tree-sitter graph.
- No learned spreading activation.
- No arbitrary graph schema or workflow builder.
- No claim of universal mutation interception.

## Falsification gates

The vertical slice fails if:

1. Two writes based on one expected file hash both apply.
2. A changed selector leaves a required direct or derived claim valid.
3. A change to `/refund_window_days` invalidates the unrelated `/currency` claim.
4. Semantic recall admits a stale claim.
5. Historical artifact versions or obsolete claims are destroyed.
6. Bedrock can persist an unverified selector.
7. The recorded demo presents local mode as CockroachDB execution.

## Competitive boundary

Evidence graphs and stale-claim memory are not new. EA-Graph is a direct research comparator. ContextSeal's implemented differentiation is the combination of distributed transactional invalidation, root/subagent live file audits, Git remote preflight, validity-gated vector recall, and replayable historical context releases.
