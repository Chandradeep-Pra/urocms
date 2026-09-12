// Redirects are always relative and restricted to routes appropriate for the user.
function safeRelativePath(raw?: string | null): string | null {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return null;
  let decoded = raw;
  try {
    for (let i = 0; i < 5; i++) {
      if (/[\\\u0000-\u0020\u007f]/.test(decoded) || decoded.startsWith("//")) return null;
      const path = decoded.split(/[?#]/)[0];
      if (path.split("/").some((part) => part === "." || part === "..")) return null;
      const next = decodeURIComponent(decoded);
      if (next === decoded) return raw;
      decoded = next;
    }
  } catch { /* malformed encoding */ }
  return null;
}

export function getPostLoginDestination(raw: string | null | undefined, isAdmin: boolean) {
  const fallback = isAdmin ? "/dashboard" : "/web";
  const safe = safeRelativePath(raw);
  if (!safe) return fallback;
  const path = safe.split(/[?#]/)[0];
  if (isAdmin) {
    // A stale student destination never overrides the admin choice.
    return path === "/dashboard" || path.startsWith("/dashboard/") ? safe : fallback;
  }
  return path === "/web" || path.startsWith("/web/") || path === "/checkout" ? safe : fallback;
}

export function getSafeAppRedirect(raw: string | null) {
  return getPostLoginDestination(raw, false);
}
