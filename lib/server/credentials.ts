export function normalizePrivateKey(privateKey?: string | null) {
  if (!privateKey) return "";

  const unescaped = privateKey.replace(/\\n/g, "\n").trim();

  if (unescaped.includes("\n")) {
    return unescaped;
  }

  return unescaped
    .replace("-----BEGIN PRIVATE KEY-----", "-----BEGIN PRIVATE KEY-----\n")
    .replace("-----END PRIVATE KEY-----", "\n-----END PRIVATE KEY-----");
}
