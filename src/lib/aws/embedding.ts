import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

const DIMENSIONS = 256;

function deterministicEmbedding(text: string): number[] {
  const vector = Array.from({ length: DIMENSIONS }, () => 0);
  for (const token of text.toLowerCase().match(/[a-z0-9]+/g) ?? []) {
    let hash = 2166136261;
    for (const character of token) { hash ^= character.charCodeAt(0); hash = Math.imul(hash, 16777619); }
    vector[Math.abs(hash) % DIMENSIONS] += (hash & 1) === 0 ? 1 : -1;
  }
  const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0)) || 1;
  return vector.map((value) => value / norm);
}

export async function embedReceiptText(text: string): Promise<number[]> {
  if (process.env.AGENT_ENGINE !== "bedrock") return deterministicEmbedding(text);
  const client = new BedrockRuntimeClient({ region: process.env.AWS_REGION?.trim() || "us-east-1" });
  const response = await client.send(new InvokeModelCommand({
    modelId: process.env.BEDROCK_EMBEDDING_MODEL_ID?.trim() || "amazon.titan-embed-text-v2:0",
    contentType: "application/json", accept: "application/json",
    body: JSON.stringify({ inputText: text, dimensions: 256, normalize: true }),
  }));
  const body = JSON.parse(new TextDecoder().decode(response.body)) as { embedding?: number[] };
  if (!body.embedding || body.embedding.length !== DIMENSIONS) throw new Error("Bedrock returned an invalid embedding");
  return body.embedding;
}
