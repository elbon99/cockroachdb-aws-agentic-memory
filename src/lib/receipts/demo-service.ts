import { proposeMemoryFromReceipts } from "@/lib/aws/claim-proposer";
import { getReceiptStore, resetReceiptStore } from "@/lib/receipts/factory";
import type { ReceiptDemoAction, ReceiptDemoResult, ReceiptSnapshot } from "@/lib/receipts/types";

const RUN_ID = "support-demo-run";
let policyDays = 30;

async function observeScenario(step: number): Promise<void> {
  const store = await getReceiptStore();
  await store.observe({
    sourceId: "policy", toolName: "observe_http_source",
    request: { sourceId: "policy", selector: "/refund_window_days" },
    response: { refund_window_days: policyDays, currency: "USD" }, sourceVersion: `github-sha-policy-${policyDays}`,
    fragments: [{ selector: "/refund_window_days", value: policyDays }], runId: RUN_ID, step,
  });
  await store.observe({
    sourceId: "order", toolName: "observe_sql_query",
    request: { queryId: "get_order", parameters: { orderId: "ORD-1042" } },
    response: { age_days: 14, damaged: true, evidence_verified: true }, sourceVersion: "orders-row-v1",
    fragments: [
      { selector: "/age_days", value: 14 }, { selector: "/damaged", value: true },
      { selector: "/evidence_verified", value: true },
    ], runId: RUN_ID, step: step + 1,
  });
}

export async function getReceiptSnapshot(): Promise<ReceiptSnapshot> {
  return (await getReceiptStore()).snapshot();
}

export async function runReceiptDemoAction(action: ReceiptDemoAction): Promise<ReceiptDemoResult> {
  if (action === "reset") {
    policyDays = 30;
    const store = await resetReceiptStore();
    return { action, message: "Cleared the run. No unreviewed memory can drive an action.", snapshot: await store.snapshot() };
  }
  const store = await getReceiptStore();
  if (action === "observe") {
    await observeScenario(1);
    return { action, message: "HTTP policy and SQL order tools emitted immutable, fragment-addressed receipts.", snapshot: await store.snapshot() };
  }
  if (action === "propose") {
    const before = await store.snapshot();
    const policy = before.sources.find((item) => item.id === "policy");
    const order = before.sources.find((item) => item.id === "order");
    if (!policy?.currentObservationId || !order?.currentObservationId) throw new Error("Observe the policy and order first");
    const policyFragment = before.fragments.find((item) => item.observationId === policy.currentObservationId && item.selector === "/refund_window_days")!;
    const orderFragments = before.fragments.filter((item) => item.observationId === order.currentObservationId);
    const values = Object.fromEntries(orderFragments.map((item) => [item.selector, item.value]));
    const fallback = policyFragment.value === "30"
      ? "A verified damaged order that is 14 days old is eligible for an automatic refund."
      : "A verified damaged order that is 14 days old is ineligible for an automatic refund.";
    const proposal = await proposeMemoryFromReceipts({
      evidence: { refundWindowDays: policyFragment.value, ...values }, fallbackStatement: fallback,
    });
    await store.propose({ statement: proposal.statement, rationale: proposal.rationale, fragmentIds: [policyFragment.id, ...orderFragments.map((item) => item.id)], proposedBy: proposal.proposedBy });
    return { action, message: `${proposal.proposedBy === "bedrock" ? "Amazon Bedrock" : "Demo fallback"} proposed a memory; it is quarantined until human approval.`, snapshot: await store.snapshot() };
  }
  if (action === "approve") {
    const proposal = (await store.snapshot()).memories.find((item) => item.status === "proposed");
    if (!proposal) throw new Error("There is no proposed memory to review");
    await store.review(proposal.id, "approved", "Evidence receipts and conclusion verified");
    return { action, message: "Human review promoted the proposal to valid memory.", snapshot: await store.snapshot() };
  }
  if (action === "act") {
    const beforeAction = await store.snapshot();
    // Consequential actions fail closed unless their evidence is freshly
    // observed. Refreshing here also detects policy drift that occurred after
    // review instead of relying on an interactive demo to beat a short TTL.
    await observeScenario(beforeAction.observations.length + 1);
    const snapshot = await store.snapshot();
    const latest = [...snapshot.memories].reverse().find((item) => item.status === "valid");
    const desired = latest?.statement.includes("ineligible") ? "deny_refund" : "issue_refund";
    const receipt = await store.act(desired);
    const recall = await store.recall("Can a damaged order that is 14 days old receive a refund?", 10);
    return { action, message: `${desired}: ${receipt.outcome}. ${receipt.reason}`, snapshot: await store.snapshot(), recall };
  }
  if (action === "change") {
    policyDays = 7;
    return { action, message: "The upstream GitHub policy changed from 30 days to 7 days. Memory is not stale until a fresh receipt proves it.", snapshot: await store.snapshot() };
  }
  if (action === "refresh") {
    await observeScenario(10);
    return { action, message: "Refresh compared selected fragment hashes and atomically marked only dependent memory stale.", snapshot: await store.snapshot() };
  }
  const recall = await store.recall("Can a damaged order that is 14 days old receive a refund?", 10);
  return { action, message: `${recall.admitted.length} approved current memories admitted; ${recall.withheld.length} unsafe memories withheld.`, snapshot: await store.snapshot(), recall };
}
