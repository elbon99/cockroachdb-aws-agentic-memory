"use client";

import { useMemo, useState } from "react";

import type { ReceiptDemoAction, ReceiptDemoResult, ReceiptSnapshot, RecallResult } from "@/lib/receipts/types";

const STEPS: Array<[ReceiptDemoAction, string]> = [
  ["observe", "1. Observe policy + order"], ["propose", "2. Propose memory"],
  ["approve", "3. Human approves"], ["act", "4. Execute decision"],
  ["change", "5. Change upstream policy"], ["refresh", "6. Refresh receipts"],
  ["recall", "7. Recall safely"], ["propose", "8. Propose replacement"],
  ["approve", "9. Approve replacement"], ["act", "10. Execute new decision"],
];

const short = (value: string) => value.slice(0, 8);
const label = (value: string) => value.replaceAll("_", " ");

export function ContextSealDemo({ initialSnapshot }: { initialSnapshot: ReceiptSnapshot }) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [recall, setRecall] = useState<RecallResult | null>(null);
  const [message, setMessage] = useState("Start by observing two independent tools. No memory exists yet.");
  const [busy, setBusy] = useState<ReceiptDemoAction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const observations = useMemo(() => new Map(snapshot.observations.map((item) => [item.id, item])), [snapshot.observations]);

  async function run(action: ReceiptDemoAction) {
    setBusy(action); setError(null);
    try {
      const response = await fetch("/api/demo", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action }) });
      const body = await response.json() as ReceiptDemoResult & { error?: string };
      if (!response.ok || body.error) throw new Error(body.error ?? "Demo action failed");
      setSnapshot(body.snapshot); setMessage(body.message); if (body.recall) setRecall(body.recall); if (action === "reset") setRecall(null);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Demo action failed"); }
    finally { setBusy(null); }
  }

  const valid = snapshot.memories.filter((item) => item.status === "valid").length;
  const unsafe = snapshot.memories.length - valid;
  return <main>
    <header className="hero shell">
      <div className="eyebrow"><span className="pulse" /> CockroachDB × AWS agentic memory</div>
      <div className="hero-grid"><div>
        <h1>Memory that proves<br />why it is <em>true.</em></h1>
        <p className="lede">ContextSeal turns every file, HTTP, or SQL tool result into an immutable receipt. Reviewed memories remain usable only while their exact evidence fragments still match.</p>
      </div><div className="invariant-card"><span>CORE INVARIANT</span><code>approved(memory) AND evidence.current</code><p>Embeddings discover. Receipts admit. Stale conclusions are withheld.</p></div></div>
    </header>

    <section className="shell status-strip">
      <div><span>STORE</span><strong>{snapshot.mode}</strong></div><div><span>SOURCES</span><strong>{snapshot.sources.length}</strong></div>
      <div><span>RECEIPTS</span><strong>{snapshot.observations.length}</strong></div><div><span>VALID</span><strong>{valid}</strong></div>
      <div><span>QUARANTINED</span><strong className="tone-stale">{unsafe}</strong></div>
    </section>

    <section className="shell demo-controls"><div><span className="section-number">01</span><h2>Watch evidence change an agent action</h2><p>{message}</p>{error && <p className="error">{error}</p>}</div>
      <div className="button-grid">{STEPS.map(([action, text], index) => <button key={`${action}-${index}`} onClick={() => run(action)} disabled={busy !== null}><b>{text.split(".")[0]}</b>{text.split(".")[1]}</button>)}<button className="secondary" onClick={() => run("reset")} disabled={busy !== null}>Reset demo</button></div>
    </section>

    <section className="shell graph-section"><div className="section-heading"><div><span className="section-number">02</span><h2>Tool receipts → accountable memory</h2></div><p>Only selected fragments participate in invalidation.</p></div>
      <div className="graph-grid"><div className="graph-column"><h3>REGISTERED TOOL SOURCES</h3>{snapshot.sources.map((source) => {
        const current = source.currentObservationId ? observations.get(source.currentObservationId) : null;
        return <article className="node artifact-node" key={source.id}><span className="node-kind">{source.kind}</span><strong>{source.label}</strong><small>{source.locator}</small><code>{current ? `${short(current.responseHash)} · step ${current.step}` : "not observed"}</code></article>;
      })}</div><div className="edge-column"><span>RECEIPT FRAGMENTS</span><div className="edge-line"/><span>REVIEW GATE</span></div>
      <div className="graph-column claims-column"><h3>MEMORY CLAIMS</h3>{snapshot.memories.length === 0 && <div className="empty-state">No model-generated memory is trusted by default.</div>}{snapshot.memories.map((memory) => <article className={`node claim-node status-${memory.status}`} key={memory.id}><div className="node-topline"><span className={`status-dot status-${memory.status}`}/><span>{label(memory.status)}</span><small>{memory.proposedBy}</small></div><strong>{memory.statement}</strong>{snapshot.dependencies.filter((dep) => dep.memoryId === memory.id).map((dep) => { const fragment = snapshot.fragments.find((item) => item.id === dep.fragmentId); return <code key={dep.fragmentId}>↳ {fragment?.selector} = {fragment?.value}</code>; })}{memory.invalidationReason && <p>{memory.invalidationReason}</p>}</article>)}</div></div>
    </section>

    <section className="shell proof-grid"><div className="proof-panel"><div className="section-heading compact"><div><span className="section-number">03</span><h2>Validity-gated recall</h2></div></div>{!recall ? <div className="empty-state">Run “Recall safely” after policy drift.</div> : <div className="recall-columns"><div><h3>ADMITTED</h3>{recall.admitted.map((item) => <div className="recall-row admitted" key={item.memory.id}><span>{item.memory.statement}</span><code>d={item.distance.toFixed(3)}</code></div>)}</div><div><h3>WITHHELD</h3>{recall.withheld.map((item) => <div className="recall-row withheld" key={item.memory.id}><span>{item.memory.statement}</span><code>{item.memory.status}</code></div>)}</div></div>}</div>
      <div className="proof-panel"><div className="section-heading compact"><div><span className="section-number">04</span><h2>Decision audit</h2></div></div><div className="timeline">{[...snapshot.actions].reverse().map((action) => <div className="timeline-row" key={action.id}><span className={`status-dot status-${action.outcome === "executed" ? "valid" : "stale"}`}/><div><strong>{label(action.action)}</strong><p>{action.reason}</p><small>{action.outcome} · memory {action.memoryId ? short(action.memoryId) : "none"}</small></div></div>)}{snapshot.actions.length === 0 && <div className="empty-state">Every consequential action will point to the memory that authorized it.</div>}</div></div>
    </section>
    <footer className="shell"><strong>CONTEXTSEAL</strong><span>tool receipts · human-reviewed memory · selective invalidation</span><code>HTTP / SQL / FILE</code></footer>
  </main>;
}
