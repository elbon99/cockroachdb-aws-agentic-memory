import { describe, expect, it } from "vitest";

import { InMemoryReceiptStore } from "@/lib/receipts/in-memory-store";

describe("tool receipt memory", () => {
  it("blocks an action until a current memory is human-approved", async () => {
    const store = new InMemoryReceiptStore();
    const first=await store.observe({sourceId:"policy",toolName:"observe_http_source",request:{},response:{days:30},sourceVersion:"v1",fragments:[{selector:"/days",value:30}],runId:"gate",step:1});
    const fragment=(await store.snapshot()).fragments.find((item)=>item.observationId===first.observationId)!;
    const memory=await store.propose({statement:"A verified 14 day order is eligible for refund.",rationale:"14 is less than 30",fragmentIds:[fragment.id],proposedBy:"deterministic-demo"});
    expect((await store.act("issue_refund")).outcome).toBe("blocked");
    await store.review(memory.id,"approved","checked");
    expect((await store.act("issue_refund")).outcome).toBe("executed");
  });

  it("withholds an approved memory when its selected evidence changes", async () => {
    const store = new InMemoryReceiptStore();
    const first = await store.observe({ sourceId:"policy",toolName:"observe_http_source",request:{sourceId:"policy"},response:{days:30},sourceVersion:"sha-30",fragments:[{selector:"/days",value:30}],runId:"test",step:1 });
    const snapshot = await store.snapshot();
    const fragment = snapshot.fragments.find((item) => item.observationId === first.observationId)!;
    const memory = await store.propose({ statement:"A 14 day old damaged order is eligible for refund.",rationale:"14 is within 30",fragmentIds:[fragment.id],proposedBy:"deterministic-demo" });
    await store.review(memory.id,"approved","checked");
    expect((await store.recall("refund")).admitted).toHaveLength(1);
    await store.observe({ sourceId:"policy",toolName:"observe_http_source",request:{sourceId:"policy"},response:{days:30,note:"preflight"},sourceVersion:"sha-30-refresh",fragments:[{selector:"/days",value:30}],runId:"test",step:2 });
    await store.observe({ sourceId:"policy",toolName:"observe_http_source",request:{sourceId:"policy"},response:{days:7},sourceVersion:"sha-7",fragments:[{selector:"/days",value:7}],runId:"test",step:3 });
    const recalled = await store.recall("refund");
    expect(recalled.admitted).toHaveLength(0);
    expect(recalled.withheld[0]?.memory.status).toBe("stale");
  });

  it("does not invalidate when an unselected response field changes", async () => {
    const store = new InMemoryReceiptStore();
    const first = await store.observe({ sourceId:"policy",toolName:"observe_http_source",request:{},response:{days:30,note:"a"},sourceVersion:"v1",fragments:[{selector:"/days",value:30}],runId:"test",step:1 });
    const fragment=(await store.snapshot()).fragments.find((item)=>item.observationId===first.observationId)!;
    const memory=await store.propose({statement:"Refunds remain available for thirty days.",rationale:"policy fragment",fragmentIds:[fragment.id],proposedBy:"deterministic-demo"});
    await store.review(memory.id,"approved","checked");
    const refresh=await store.observe({sourceId:"policy",toolName:"observe_http_source",request:{},response:{days:30,note:"b"},sourceVersion:"v2",fragments:[{selector:"/days",value:30}],runId:"test",step:2});
    expect(refresh.changed).toBe(false);
    expect((await store.recall("refund")).admitted).toHaveLength(1);
  });
});
