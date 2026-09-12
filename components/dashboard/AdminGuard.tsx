"use client";

import { onIdTokenChanged, signOut } from "firebase/auth";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { auth } from "@/lib/firebaseClient";
import { syncTestingZoneAuth } from "@/lib/testingZoneAuthHandoff";

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

    const handleLogout = (event: StorageEvent) => {
      if (event.key !== "urologics-auth-logged-out" || event.newValue !== "1") return;
      void signOut(auth).then(() => router.replace("/login"));
    };
    window.addEventListener("storage", handleLogout);

    const unsubscribe = onIdTokenChanged(auth, async (user) => {
      if (!user) {
        if (!cancelled) {
          router.replace(`/login?next=${encodeURIComponent(pathname)}`);
        }
        return;
      }

      try {
        const token = await user.getIdToken();
        const response = await fetch("/api/auth/role", {
          cache: "no-store",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) throw new Error("Unable to verify admin access");
        const role = await response.json();
        if (cancelled || auth.currentUser?.uid !== user.uid) return;
        if (!role.isAdmin) {
          await syncTestingZoneAuth(user, token);
          if (!cancelled) window.location.assign("/web");
          return;
        }

        if (!cancelled) {
          setStatus("allowed");
        }
      } catch (error) {
        console.error("Admin guard error:", error);
        if (!cancelled) {
          router.replace(`/login?next=${encodeURIComponent(pathname)}`);
        }
      }
    });

    return () => {
      cancelled = true;
      window.removeEventListener("storage", handleLogout);
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
