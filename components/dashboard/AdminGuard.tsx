"use client";

import { onAuthStateChanged, signOut } from "firebase/auth";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { auth } from "@/lib/firebaseClient";

export default function AdminGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [status, setStatus] = useState<"checking" | "allowed">("checking");

  useEffect(() => {
    let cancelled = false;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        if (!cancelled) {
          router.replace("/login");
        }
        return;
      }

      try {
        const token = await user.getIdToken();
        const response = await fetch("/api/admin/session", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          await signOut(auth);
          if (!cancelled) {
            router.replace("/login");
          }
          return;
        }

        if (!cancelled) {
          setStatus("allowed");
        }
      } catch (error) {
        console.error("Admin guard error:", error);
        await signOut(auth).catch(() => {});
        if (!cancelled) {
          router.replace("/login");
        }
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [pathname, router]);

  if (status !== "allowed") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-5 text-sm text-slate-600 shadow-sm">
          Verifying admin access...
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
