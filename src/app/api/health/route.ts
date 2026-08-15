import { NextResponse } from "next/server";

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    status: "ok",
    service: "contextseal",
    environment: process.env.APP_ENVIRONMENT ?? "development",
    database: process.env.DATABASE_URL ? "cockroachdb" : "local-demo",
    agent: process.env.AGENT_ENGINE === "bedrock" ? "bedrock" : "deterministic",
    timestamp: new Date().toISOString(),
  });
}
