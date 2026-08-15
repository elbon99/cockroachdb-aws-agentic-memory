const DIMENSIONS = 8;

export function embedText(text: string): number[] {
  const vector = Array.from({ length: DIMENSIONS }, () => 0);
  const tokens = text.toLowerCase().match(/[a-z0-9]+/g) ?? [];

  for (const token of tokens) {
    let hash = 2166136261;
    for (const character of token) {
      hash ^= character.charCodeAt(0);
      hash = Math.imul(hash, 16777619);
    }

    const index = Math.abs(hash) % DIMENSIONS;
    const sign = (hash & 1) === 0 ? 1 : -1;
    vector[index] += sign * (1 + Math.min(token.length, 12) / 12);
  }

  const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
  if (magnitude === 0) {
    return vector;
  }

  return vector.map((value) => Number((value / magnitude).toFixed(8)));
}
export function cosineDistance(left: number[], right: number[]): number {
  const dot = left.reduce((sum, value, index) => sum + value * (right[index] ?? 0), 0);
  const leftMagnitude = Math.sqrt(left.reduce((sum, value) => sum + value * value, 0));
  const rightMagnitude = Math.sqrt(right.reduce((sum, value) => sum + value * value, 0));

  if (leftMagnitude === 0 || rightMagnitude === 0) {
    return 1;
  }

  return Number((1 - dot / (leftMagnitude * rightMagnitude)).toFixed(8));
}

export function toVectorLiteral(vector: number[]): string {
  return `[${vector.join(",")}]`;
}
