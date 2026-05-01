export function normalizePrivateKey(privateKey?: string | null) {
  if (!privateKey) return "";

  const unescaped = privateKey.replace(/\\n/g, "\n").trim();
  const beginMarker = "-----BEGIN PRIVATE KEY-----";
  const endMarker = "-----END PRIVATE KEY-----";

  if (!unescaped.includes(beginMarker) || !unescaped.includes(endMarker)) {
    return unescaped;
  }

  const body = unescaped
    .replace(beginMarker, "")
    .replace(endMarker, "")
    .replace(/\s+/g, "");

  const wrappedBody = body.match(/.{1,64}/g)?.join("\n") ?? body;

  return `${beginMarker}\n${wrappedBody}\n${endMarker}`;
}

export function isPemPrivateKey(privateKey?: string | null) {
  const normalized = normalizePrivateKey(privateKey);
  return (
    normalized.includes("-----BEGIN PRIVATE KEY-----") &&
    normalized.includes("-----END PRIVATE KEY-----")
  );
}
