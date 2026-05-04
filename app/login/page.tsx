"use client"

import {
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signOut,
  signInWithPopup,
} from "firebase/auth"
import { auth } from "@/lib/firebaseClient"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Chrome, Loader2 } from "lucide-react"

async function verifyAdminAccess(idToken: string) {
  const response = await fetch("/api/admin/session", {
    headers: {
      Authorization: `Bearer ${idToken}`,
    },
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.error || "Admin access denied");
  }
}

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState("")

  const login = async () => {
      setError("")
      try {
        setLoading(true)
      const credential = await signInWithEmailAndPassword(auth, email, password)
      const token = await credential.user.getIdToken()
      await verifyAdminAccess(token)
      router.push("/dashboard")
    } catch (err: any) {
      console.error("Admin login error:", err)
      await signOut(auth).catch(() => {})
      setError(err?.message || "Invalid email or password")
    } finally {
      setLoading(false)
    }
  }

  const loginWithGoogle = async () => {
    setError("")

    try {
      setGoogleLoading(true)
      const provider = new GoogleAuthProvider()
      provider.setCustomParameters({
        prompt: "select_account",
      })

      const credential = await signInWithPopup(auth, provider)
      const token = await credential.user.getIdToken()
      await verifyAdminAccess(token)

      const response = await fetch("/api/auth/google/complete", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(data?.error || "Failed to finalize Google sign-in")
      }

      router.push("/dashboard")
    } catch (err: any) {
      console.error("Admin Google login error:", err)
      await signOut(auth).catch(() => {})
      setError(err?.message || "Google sign-in failed")
    } finally {
      setGoogleLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0f0d] px-4">
      <div className="w-full max-w-md rounded-3xl bg-[#111816] border border-emerald-900/40 shadow-2xl shadow-emerald-500/20 p-8 space-y-8">

        {/* Brand */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-extrabold tracking-tight text-emerald-400">
            Urologics
          </h1>
          <p className="text-sm text-slate-400">
            Admin access only
          </p>
        </div>

        {/* Form */}
        <div className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm text-slate-400">Email</label>
            <input
              type="email"
              placeholder="admin@urologics.app"
              className="w-full rounded-xl bg-[#0d1412] border border-emerald-900/40 px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm text-slate-400">Password</label>
            <input
              type="password"
              placeholder="••••••••"
              className="w-full rounded-xl bg-[#0d1412] border border-emerald-900/40 px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && (
            <p className="text-sm text-red-400">
              {error}
            </p>
          )}
        </div>

        {/* Action */}
        <Button
          onClick={login}
          disabled={loading || googleLoading}
          className="w-full bg-emerald-500 hover:bg-emerald-400 text-black rounded-2xl py-6 text-base font-semibold shadow-lg shadow-emerald-500/30"
        >
          {loading ? "Signing in..." : "Sign in to Dashboard"}
        </Button>

        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-emerald-900/40" />
          <span className="text-xs uppercase tracking-[0.2em] text-slate-500">or</span>
          <div className="h-px flex-1 bg-emerald-900/40" />
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={loginWithGoogle}
          disabled={loading || googleLoading}
          className="w-full rounded-2xl border border-white/10 bg-white/[0.03] py-6 text-base font-semibold text-white hover:bg-white/[0.07]"
        >
          {googleLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Signing in with Google...
            </>
          ) : (
            <>
              <Chrome className="h-4 w-4" />
              Continue with Google
            </>
          )}
        </Button>

        {/* Footer */}
        <p className="text-center text-xs text-slate-500">
          Unauthorized access is prohibited
        </p>
      </div>
    </div>
  )
}
