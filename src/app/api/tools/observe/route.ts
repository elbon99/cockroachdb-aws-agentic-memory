import { NextResponse } from "next/server";
import { z } from "zod";

import { getReceiptStore } from "@/lib/receipts/factory";
import { observeGitHubContents, observeOrder } from "@/lib/tools/adapters";

export const dynamic = "force-dynamic";

const schema = z.object({
  sourceId: z.enum(["policy", "order", "local-runbook"]),
  selectors: z.array(z.string().startsWith("/").max(200)).min(1).max(10),
  runId: z.string().min(1).max(100),
  step: z.number().int().nonnegative(),
  sourceVersion: z.string().min(1).max(256).optional(),
  fragments: z.array(z.object({ selector:z.string().startsWith("/").max(200), value:z.unknown() })).max(10).optional(),
});

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const input = schema.parse(await request.json());
    if (input.sourceId === "local-runbook") {
      const expected = process.env.CONTEXTSEAL_INGEST_TOKEN;
      if (!expected || request.headers.get("authorization") !== `Bearer ${expected}`) {
        return NextResponse.json({ error:"Local file observation requires the private ingestion token" }, { status:401 });
      }
    }
    const observed = input.sourceId === "policy"
      ? await observeGitHubContents(input.selectors)
      : input.sourceId === "order"
        ? await observeOrder("ORD-1042")
        : {
            response:{ sanitizedFragments:input.fragments },
            sourceVersion:input.sourceVersion ?? "",
            fragments:input.fragments ?? [],
          };
    if (input.sourceId === "local-runbook" && (!observed.sourceVersion || observed.fragments.length === 0)) {
      throw new Error("Local observer must provide a file hash and sanitized fragments");
    }
    const result = await (await getReceiptStore()).observe({
      sourceId:input.sourceId, toolName:input.sourceId === "policy" ? "observe_http_source" : input.sourceId === "order" ? "observe_sql_query" : "observe_file",
      request:{ sourceId:input.sourceId, selectors:input.selectors }, response:observed.response,
      sourceVersion:observed.sourceVersion, fragments:observed.fragments, runId:input.runId, step:input.step,
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error:error instanceof Error ? error.message : "Observation failed" }, { status:400 });
  }
}
