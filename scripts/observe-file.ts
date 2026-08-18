import { observeFile } from "../src/lib/tools/file-adapter";

try { process.loadEnvFile(".env.local"); } catch { /* Environment variables may be injected. */ }
const endpoint=process.env.CONTEXTSEAL_API_URL?.trim() || "http://localhost:3000";
const token=process.env.CONTEXTSEAL_INGEST_TOKEN?.trim();
if(!token) throw new Error("CONTEXTSEAL_INGEST_TOKEN is required");
const selectors=(process.argv.slice(3).length ? process.argv.slice(3) : ["/escalation_team"]);
const observed=await observeFile(process.argv[2] || process.env.DEMO_FILE_PATH?.trim() || "demo/runbook.json",selectors);
const response=await fetch(`${endpoint}/api/tools/observe`,{method:"POST",headers:{"content-type":"application/json",authorization:`Bearer ${token}`},body:JSON.stringify({sourceId:"local-runbook",selectors,runId:`local-${Date.now()}`,step:1,sourceVersion:observed.sourceVersion,fragments:observed.fragments})});
const body=await response.text();
if(!response.ok) throw new Error(body);
console.log(body);
