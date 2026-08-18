import { readFile } from "node:fs/promises";
import { isAbsolute, relative, resolve } from "node:path";

import { sha256 } from "@/lib/domain/hash";
import type { AdapterObservation } from "@/lib/tools/adapters";

function pointer(value: unknown, selector: string): unknown {
  if (selector === "") return value;
  return selector.slice(1).split("/").reduce<unknown>((current, part) => {
    if (!current || typeof current !== "object" || !(part in current)) throw new Error(`Selector ${selector} was not found`);
    return (current as Record<string,unknown>)[part];
  },value);
}

/** Local-only reader. Only sanitized fragments and a file hash cross the network. */
export async function observeFile(path: string, selectors: string[]): Promise<AdapterObservation> {
  const root=resolve(process.env.CONTEXTSEAL_FILE_ROOT?.trim() || process.cwd());
  const target=resolve(root,path); const rel=relative(root,target);
  if(isAbsolute(rel)||rel.startsWith("..")) throw new Error("File is outside CONTEXTSEAL_FILE_ROOT");
  if(/(^|[\\/])(\.env|id_rsa|credentials)(\.|$)/i.test(target)) throw new Error("Secret-bearing files cannot be observed");
  const content=await readFile(target,"utf8");
  if(Buffer.byteLength(content)>1_000_000) throw new Error("File observation exceeds 1 MB");
  const parsed=target.endsWith(".json") ? JSON.parse(content) : content;
  return {response:parsed,sourceVersion:sha256(content),fragments:selectors.map((selector)=>({selector,value:typeof parsed==="string"?parsed:pointer(parsed,selector)}))};
}
