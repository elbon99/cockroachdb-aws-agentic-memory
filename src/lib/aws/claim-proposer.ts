import { BedrockRuntimeClient, ConverseCommand } from "@aws-sdk/client-bedrock-runtime";
import { z } from "zod";

const proposalSchema = z.object({
  statement: z.string().min(12).max(500),
  selector: z.string().startsWith("/"),
  rationale: z.string().min(8).max(500),
});

export interface BedrockClaimProposal {
  statement: string;
  selector: string;
  rationale: string;
  telemetry: {
    modelId: string;
    inputTokens: number;
    outputTokens: number;
    latencyMs: number;
  };
}

function extractJson(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("Bedrock did not return a JSON object");
  return JSON.parse(text.slice(start, end + 1));
}

export async function proposeClaimFromArtifactDrift(input: {
  path: string;
  selector: string;
  previousValue: string;
  currentValue: string;
}): Promise<BedrockClaimProposal> {
  const region = process.env.AWS_REGION?.trim() || "us-east-1";
  const modelId = process.env.BEDROCK_MODEL_ID?.trim() || "amazon.nova-lite-v1:0";
  const client = new BedrockRuntimeClient({ region });
  const startedAt = performance.now();
  const response = await client.send(
    new ConverseCommand({
      modelId,
      system: [
        {
          text: [
            "You propose a concise agent-memory claim after a versioned artifact changes.",
            "Return JSON only with statement, selector, and rationale.",
            "Never invent another selector or evidence source.",
            "The application will independently verify the selector and content hash.",
          ].join(" "),
        },
      ],
      messages: [
        {
          role: "user",
          content: [
            {
              text: JSON.stringify({
                path: input.path,
                selector: input.selector,
                previousValue: input.previousValue,
                currentValue: input.currentValue,
              }),
            },
          ],
        },
      ],
      inferenceConfig: { maxTokens: 250, temperature: 0 },
    }),
  );
  const text = response.output?.message?.content
    ?.map((item) => ("text" in item ? item.text ?? "" : ""))
    .join("") ?? "";
  const proposal = proposalSchema.parse(extractJson(text));
  if (proposal.selector !== input.selector) {
    throw new Error(`Bedrock proposed unverified selector ${proposal.selector}`);
  }
  return {
    ...proposal,
    telemetry: {
      modelId,
      inputTokens: response.usage?.inputTokens ?? 0,
      outputTokens: response.usage?.outputTokens ?? 0,
      latencyMs: Math.round(performance.now() - startedAt),
    },
  };
}
