import { NextResponse } from "next/server";
import { z } from "zod";

import { getDemoSnapshot, runDemoAction } from "@/lib/memory-graph/demo-service";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  action: z.enum(["reset", "read", "mutate", "reverify", "recall", "race"]),
});

export async function GET(): Promise<NextResponse> {
  return NextResponse.json(await getDemoSnapshot());
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = bodySchema.parse(await request.json());
    return NextResponse.json(await runDemoAction(body.action));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown demo error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
