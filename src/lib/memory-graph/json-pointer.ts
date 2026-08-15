import { canonicalJson } from "@/lib/domain/hash";

function decodeToken(token: string): string {
  return token.replace(/~1/g, "/").replace(/~0/g, "~");
}

export function resolveJsonPointer(content: string, pointer: string): unknown {
  const document: unknown = JSON.parse(content);
  if (pointer === "") {
    return document;
  }
  if (!pointer.startsWith("/")) {
    throw new Error(`Invalid JSON Pointer: ${pointer}`);
  }

  let current = document;
  for (const rawToken of pointer.slice(1).split("/")) {
    const token = decodeToken(rawToken);
    if (Array.isArray(current)) {
      const index = Number(token);
      if (!Number.isInteger(index) || index < 0 || index >= current.length) {
        throw new Error(`JSON Pointer ${pointer} does not resolve`);
      }
      current = current[index];
      continue;
    }
    if (!current || typeof current !== "object" || !(token in current)) {
      throw new Error(`JSON Pointer ${pointer} does not resolve`);
    }
    current = (current as Record<string, unknown>)[token];
  }
  return current;
}

export function canonicalPointerValue(content: string, pointer: string): string {
  return canonicalJson(resolveJsonPointer(content, pointer));
}
