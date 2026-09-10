// Hosting owns /web routing. Never send login tokens to a different app origin.
export function getSafeAppRedirect(rawRedirect: string | null) {
  if (!rawRedirect || /[\\\u0000-\u0020]/.test(rawRedirect)) return "/web";
  try {
    const url = new URL(rawRedirect, "https://urologics.co.uk");
    if (url.origin !== "https://urologics.co.uk" || url.username || url.password) return "/web";
    if (url.pathname !== "/web" && !url.pathname.startsWith("/web/") && url.pathname !== "/checkout") return "/web";
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/web";
  }
}
