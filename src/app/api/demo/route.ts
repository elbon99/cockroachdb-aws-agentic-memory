import { NextResponse } from "next/server";
import { z } from "zod";

import { getReceiptSnapshot, runReceiptDemoAction } from "@/lib/receipts/demo-service";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  action: z.enum(["reset", "observe", "propose", "approve", "act", "change", "refresh", "recall"]),
});

export async function GET(): Promise<NextResponse> {
  return NextResponse.json(await getReceiptSnapshot());
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = bodySchema.parse(await request.json());
    return NextResponse.json(await runReceiptDemoAction(body.action));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown demo error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
