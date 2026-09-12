import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AUTH_COOKIE, verifyAdminToken } from "@/lib/server/adminAccess";

export const requireDashboardSession = cache(async () => {
  const token = (await cookies()).get(AUTH_COOKIE)?.value;
  if (!token) redirect("/login?next=/dashboard");
  let session;
  try {
    session = await verifyAdminToken(token);
  } catch {
    redirect("/login?next=/dashboard");
  }
  if (!session) redirect("/web");
  return session;
});
