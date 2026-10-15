import LoginPanel from "@/components/auth/LoginPanel";

// Always serve the current account page, including its selected signup tab.
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function LoginPage({ searchParams }: {
  searchParams: Promise<{ mode?: string }>;
}) {
  const { mode } = await searchParams;
  return <LoginPanel initialMode={mode === "signup" ? "signup" : "login"} />;
}
