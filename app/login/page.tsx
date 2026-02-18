"use client"

import { signInWithEmailAndPassword } from "firebase/auth"
import { auth } from "@/lib/firebaseClient"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Button } from "@/components/ui/button"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const login = async () => {
    setError("")
    try {
      setLoading(true)
      await signInWithEmailAndPassword(auth, email, password)
      router.push("/dashboard")
    } catch (err) {
      setError("Invalid email or password")
    } finally {
      setLoading(false)
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
          disabled={loading}
          className="w-full bg-emerald-500 hover:bg-emerald-400 text-black rounded-2xl py-6 text-base font-semibold shadow-lg shadow-emerald-500/30"
        >
          {loading ? "Signing in..." : "Sign in to Dashboard"}
        </Button>

        {/* Footer */}
        <p className="text-center text-xs text-slate-500">
          Unauthorized access is prohibited
        </p>
      </div>
    </div>
  )
}
