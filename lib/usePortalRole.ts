"use client"

import { useEffect, useState } from "react"
import type { User } from "firebase/auth"

// The allowlist stays on the server; only the verified role reaches the browser.
export function usePortalRole(user: User | null) {
  const [result, setResult] = useState<{ uid: string; isAdmin?: boolean; error?: string } | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    async function checkRole() {
      try {
        const token = await user!.getIdToken()
        const response = await fetch("/api/auth/role", {
          cache: "no-store",
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!response.ok) throw new Error("Unable to check account access. Please retry.")
        const role = await response.json()
        if (!cancelled) setResult({ uid: user!.uid, isAdmin: role.isAdmin === true })
      } catch {
        if (!cancelled) setResult({ uid: user!.uid, error: "Unable to check account access. Please retry." })
      }
    }
    void checkRole()
    return () => { cancelled = true }
  }, [user, attempt])

  const current = user && result?.uid === user.uid ? result : null
  return {
    isAdmin: current?.isAdmin,
    checking: Boolean(user && !current),
    error: current?.error,
    retry: () => { setResult(null); setAttempt(value => value + 1) },
  }
}
