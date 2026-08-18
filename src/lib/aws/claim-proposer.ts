import { BedrockRuntimeClient, ConverseCommand } from "@aws-sdk/client-bedrock-runtime";
import { z } from "zod";

export interface ReceiptMemoryProposal {
  statement: string;
  rationale: string;
  proposedBy: "bedrock" | "deterministic-demo";
}

function extractJson(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("Bedrock did not return a JSON object");
  return JSON.parse(text.slice(start, end + 1));
}

export async function proposeMemoryFromReceipts(input: {
  evidence: Record<string, string>;
  fallbackStatement: string;
}): Promise<ReceiptMemoryProposal> {
  if (process.env.AGENT_ENGINE !== "bedrock") {
    return {
      statement: input.fallbackStatement,
      rationale: "Deterministic fallback derived from the displayed receipt fragments.",
      proposedBy: "deterministic-demo",
    };
  }
  const region = process.env.AWS_REGION?.trim() || "us-east-1";
  const modelId = process.env.BEDROCK_MODEL_ID?.trim() || "amazon.nova-lite-v1:0";
  const response = await new BedrockRuntimeClient({ region }).send(new ConverseCommand({
    modelId,
    system: [{ text: "Propose one concise support decision from only the supplied evidence. Return JSON with statement and rationale. Never invent facts." }],
    messages: [{ role: "user", content: [{ text: JSON.stringify(input.evidence) }] }],
    inferenceConfig: { maxTokens: 180, temperature: 0 },
  }));
  const text = response.output?.message?.content?.map((item) => "text" in item ? item.text ?? "" : "").join("") ?? "";
  const parsed = z.object({ statement: z.string().min(12).max(500), rationale: z.string().min(8).max(500) }).parse(extractJson(text));
  return { ...parsed, proposedBy: "bedrock" };
}
