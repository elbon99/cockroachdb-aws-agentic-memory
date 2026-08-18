import { CockroachReceiptStore } from "../src/lib/receipts/cockroach-store";

try { process.loadEnvFile(".env.local"); } catch { /* Environment variables may be injected. */ }
const url=process.env.DATABASE_URL?.trim(); if(!url) throw new Error("DATABASE_URL is required");
const store=new CockroachReceiptStore(url); await store.reset();
const first=await store.observe({sourceId:"policy",toolName:"observe_http_source",request:{},response:{days:30},sourceVersion:"v1",fragments:[{selector:"/days",value:30}],runId:"stress-seed",step:1});
const fragment=(await store.snapshot()).fragments.find((item)=>item.observationId===first.observationId)!;
const memory=await store.propose({statement:"A fourteen day old order is eligible for a refund.",rationale:"14 is within 30",fragmentIds:[fragment.id],proposedBy:"deterministic-demo"});
await store.review(memory.id,"approved","stress fixture");
await Promise.all(Array.from({length:25},(_,index)=>store.observe({sourceId:"policy",toolName:"observe_http_source",request:{worker:index},response:{days:7},sourceVersion:`v2-worker-${index}`,fragments:[{selector:"/days",value:7}],runId:"stress",step:index})));
const snapshot=await store.snapshot();
const stale=snapshot.memories.find((item)=>item.id===memory.id)?.status;
console.log(JSON.stringify({concurrentRefreshes:25,observations:snapshot.observations.length,memoryStatus:stale},null,2));
if(stale!=="stale") throw new Error("Expected dependent memory to be stale");
