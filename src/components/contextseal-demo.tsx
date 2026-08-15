"use client";

import { useEffect, useMemo, useState } from "react";

import type { GitPreflightResult } from "@/lib/git/preflight";
import type { DemoAction, DemoActionResult } from "@/lib/memory-graph/demo-service";
import type {
  Artifact,
  MemoryGraphSnapshot,
  RecallResult,
} from "@/lib/memory-graph/types";

function short(value: string): string {
  return value.slice(0, 8);
}

function statusLabel(status: string): string {
  return status.replaceAll("_", " ");
}

function artifactLabel(artifact: Artifact): string {
  return artifact.selector || "whole file";
}

export function ContextSealDemo({ initialSnapshot }: { initialSnapshot: MemoryGraphSnapshot }) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [recall, setRecall] = useState<RecallResult | null>(null);
  const [git, setGit] = useState<Partial<GitPreflightResult> | null>(null);
  const [message, setMessage] = useState(
    "Start with the subagent read, then introduce upstream policy drift.",
  );
  const [busy, setBusy] = useState<DemoAction | "git" | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/git/preflight")
      .then(async (response) => {
        const body = (await response.json()) as Partial<GitPreflightResult> & { error?: string };
        if (active) setGit(body);
      })
      .catch(() => {
        if (active) setGit({ remoteFreshness: "unknown" });
      });
    return () => {
      active = false;
    };
  }, []);

  const versionsById = useMemo(
    () => new Map(snapshot.artifactVersions.map((version) => [version.id, version])),
    [snapshot.artifactVersions],
  );
  const artifactsById = useMemo(
    () => new Map(snapshot.artifacts.map((artifact) => [artifact.id, artifact])),
    [snapshot.artifacts],
  );
  const validClaims = snapshot.claims.filter((claim) => claim.status === "valid").length;
  const withheldClaims = snapshot.claims.length - validClaims;

  async function run(action: DemoAction) {
    setBusy(action);
    setError(null);
    try {
      const response = await fetch("/api/demo", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const body = (await response.json()) as DemoActionResult & { error?: string };
      if (!response.ok || body.error) throw new Error(body.error ?? "Demo action failed");
      setSnapshot(body.snapshot);
      setMessage(body.message);
      setRecall(body.recall ?? (action === "reset" ? null : recall));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Demo action failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <main>
      <header className="hero shell">
        <div className="eyebrow"><span className="pulse" /> CockroachDB × AWS agentic memory</div>
        <div className="hero-grid">
          <div>
            <h1>Memory that knows<br />when it is <em>wrong.</em></h1>
            <p className="lede">
              ContextSeal anchors agent conclusions to exact Git artifacts, then atomically
              withholds every dependent memory when its evidence changes.
            </p>
          </div>
          <div className="invariant-card">
            <span>CORE INVARIANT</span>
            <code>claim.version == artifact.current_version</code>
            <p>Semantic similarity discovers. Evidence validity admits.</p>
          </div>
        </div>
      </header>

      <section className="shell status-strip" aria-label="Runtime status">
        <div><span>STORE</span><strong>{snapshot.mode}</strong></div>
        <div><span>GIT REMOTE</span><strong className={`tone-${git?.remoteFreshness ?? "unknown"}`}>{git?.remoteFreshness ?? "checking"}</strong></div>
        <div><span>VALID MEMORIES</span><strong>{validClaims}</strong></div>
        <div><span>WITHHELD</span><strong className="tone-stale">{withheldClaims}</strong></div>
        <div><span>AGENTS</span><strong>{snapshot.agents.length}</strong></div>
      </section>

      <section className="shell demo-controls">
        <div>
          <span className="section-number">01</span>
          <h2>Run the failure, then watch the guardrail</h2>
          <p>{message}</p>
          {error && <p className="error">{error}</p>}
        </div>
        <div className="button-grid">
          <button onClick={() => run("read")} disabled={busy !== null}><b>1</b> Subagent reads</button>
          <button onClick={() => run("mutate")} disabled={busy !== null}><b>2</b> Remote changes</button>
          <button onClick={() => run("recall")} disabled={busy !== null}><b>3</b> Recall safely</button>
          <button onClick={() => run("reverify")} disabled={busy !== null}><b>4</b> Re-verify</button>
          <button className="secondary" onClick={() => run("race")} disabled={busy !== null}>Race two writers</button>
          <button className="secondary" onClick={() => run("reset")} disabled={busy !== null}>Reset demo</button>
        </div>
      </section>

      <section className="shell graph-section">
        <div className="section-heading">
          <div><span className="section-number">02</span><h2>Live evidence graph</h2></div>
          <p>Hashes, not prose confidence, determine freshness.</p>
        </div>
        <div className="graph-grid">
          <div className="graph-column">
            <h3>VERSIONED ARTIFACTS</h3>
            {snapshot.artifacts.map((artifact) => {
              const version = versionsById.get(artifact.currentVersionId);
              return (
                <article className="node artifact-node" key={artifact.id}>
                  <span className="node-kind">{artifact.kind}</span>
                  <strong>{artifactLabel(artifact)}</strong>
                  <small>{artifact.path}</small>
                  <code>{version ? short(version.contentHash) : "missing"} · v{version?.ordinal ?? "?"}</code>
                </article>
              );
            })}
          </div>

          <div className="edge-column" aria-hidden="true">
            <span>SUPPORTED_BY</span><div className="edge-line" /><span>DERIVED_FROM</span>
          </div>

          <div className="graph-column claims-column">
            <h3>AGENT MEMORIES</h3>
            {snapshot.claims.map((claim) => {
              const deps = snapshot.dependencies.filter((item) => item.claimId === claim.id);
              return (
                <article className={`node claim-node status-${claim.status}`} key={claim.id}>
                  <div className="node-topline">
                    <span className={`status-dot status-${claim.status}`} />
                    <span>{statusLabel(claim.status)}</span>
                    <small>{claim.evidenceStrength}</small>
                  </div>
                  <strong>{claim.statement}</strong>
                  {deps.map((dep) => {
                    const artifact = artifactsById.get(dep.artifactId);
                    return <code key={dep.artifactId}>↳ {artifact ? artifactLabel(artifact) : dep.artifactId} @ {short(dep.anchoredVersionId)}</code>;
                  })}
                  {claim.invalidationReason && <p>{claim.invalidationReason}</p>}
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="shell proof-grid">
        <div className="proof-panel">
          <div className="section-heading compact"><div><span className="section-number">03</span><h2>Validity-gated recall</h2></div></div>
          {!recall ? (
            <div className="empty-state">Run “Recall safely” to query every memory, including obsolete matches.</div>
          ) : (
            <div className="recall-columns">
              <div><h3>ADMITTED</h3>{recall.admissible.map((item) => <div className="recall-row admitted" key={item.claim.id}><span>{item.claim.statement}</span><code>d={item.distance.toFixed(3)}</code></div>)}</div>
              <div><h3>WITHHELD</h3>{recall.withheld.map((item) => <div className="recall-row withheld" key={item.claim.id}><span>{item.claim.statement}</span><code>{item.claim.status}</code></div>)}</div>
            </div>
          )}
        </div>

        <div className="proof-panel">
          <div className="section-heading compact"><div><span className="section-number">04</span><h2>Multi-agent audit</h2></div></div>
          <div className="agent-tree">
            {snapshot.agents.map((agent) => <div className={agent.role} key={agent.id}><span>{agent.role === "root" ? "ROOT" : "SUB"}</span><strong>{agent.displayName}</strong><small>{agent.id}</small></div>)}
          </div>
          <div className="timeline">
            {snapshot.writes.length === 0 && snapshot.reads.length === 0 && <div className="empty-state">No reads or writes recorded in this run.</div>}
            {[...snapshot.writes].reverse().map((event) => <div className="timeline-row" key={event.id}><span className={`status-dot ${event.outcome === "applied" ? "status-valid" : "status-stale"}`} /><div><strong>{event.agentId}</strong><p>{event.summary}</p><small>{event.outcome} · {event.invalidatedClaimIds.length} invalidated</small></div></div>)}
            {[...snapshot.reads].reverse().map((event) => <div className="timeline-row" key={event.id}><span className="read-icon">R</span><div><strong>{event.agentId}</strong><p>Read {artifactsById.get(event.artifactId)?.selector || "whole file"}</p><small>{event.purpose}</small></div></div>)}
          </div>
        </div>
      </section>

      <footer className="shell">
        <strong>CONTEXTSEAL</strong>
        <span>Git-aware evidence lineage · selective invalidation · replayable history</span>
        <code>{short(snapshot.repository.localHead)} / {snapshot.repository.branch}</code>
      </footer>
    </main>
  );
}
