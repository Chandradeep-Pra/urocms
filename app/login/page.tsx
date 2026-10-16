import LoginPanel from "@/components/auth/LoginPanel";
import { redirect } from "next/navigation";

// Always serve the current account page, including its selected signup tab.
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function LoginPage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const mode = query.mode;
  if (mode !== "login" && mode !== "signup") {
    const params = new URLSearchParams({ mode: "login" });
    for (const [key, value] of Object.entries(query)) {
      if (key === "mode" || value === undefined) continue;
      for (const item of Array.isArray(value) ? value : [value]) params.append(key, item);
    }
    redirect(`/login?${params}`);
  }
  return <LoginPanel initialMode={mode === "signup" ? "signup" : "login"} />;
}
