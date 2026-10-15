from pathlib import Path
root = Path(r'C:/Users/chand/Downloads/testing-zone')
(root / 'lib/main-login.ts').write_text('''import { appPath, APP_BASE_PATH, loginReturnPath } from "@/lib/app-path";
import { getUrologicsApiUrl } from "@/lib/urologics-api";

export function mainLoginUrl(requested: string | null = null, signup = false) {
  const login = new URL(getUrologicsApiUrl("/login"));
  const route = loginReturnPath(requested);
  let pathname = route.split(/[?#]/)[0];
  try { pathname = decodeURIComponent(pathname); } catch { pathname = "/"; }
  const destination = pathname.replace(/\\/+$/, "") === "/login" || route === "/"
    ? APP_BASE_PATH || "/"
    : appPath(route);
  login.searchParams.set("redirect", destination);
  if (signup) login.searchParams.set("mode", "signup");
  return login.toString();
}
''', encoding='utf-8')
(root / 'app/login/page.tsx').write_text('''import { redirect } from "next/navigation";
import { mainLoginUrl } from "@/lib/main-login";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Keep old bookmarks working while sharing the CMS account page.
export default async function LoginPage({ searchParams }: {
  searchParams: Promise<{ redirect?: string; next?: string; mode?: string }>;
}) {
  const query = await searchParams;
  redirect(mainLoginUrl(query.redirect ?? query.next ?? null, query.mode === "signup"));
}
''', encoding='utf-8')
p = root / 'app/page.tsx'
s = p.read_text(encoding='utf-8').replace('      router.push("/login");', '      window.location.assign("/login?redirect=%2Fweb");')
p.write_text(s,encoding='utf-8')
print('Testing Zone now redirects its old login route to the shared CMS account page.')
