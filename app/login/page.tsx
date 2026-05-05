"use client"

import { Button } from "@/components/ui/button"
import { auth } from "@/lib/firebaseClient"
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
  type User,
} from "firebase/auth"
import { Chrome, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

const NON_ADMIN_REDIRECT_URL = "https://testing-zone-five.vercel.app"
const ALLOWED_APP_REDIRECT_ORIGIN = "https://testing-zone-five.vercel.app"

async function verifyAdminAccess(idToken: string) {
  const response = await fetch("/api/admin/session", {
    headers: {
      Authorization: `Bearer ${idToken}`,
    },
  })

  const data = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(data?.error || "Admin access denied")
  }
}

async function completeEmailOnboarding(idToken: string) {
  const response = await fetch("/api/validate-user", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${idToken}`,
    },
  })

  const data = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(data?.error || "Failed to initialize user profile")
  }
}

async function completeGoogleOnboarding(idToken: string) {
  const response = await fetch("/api/auth/google/complete", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${idToken}`,
    },
  })

  const data = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(data?.error || "Failed to finalize Google sign-in")
  }
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

function getSafeAppRedirect(rawRedirect: string | null) {
  if (!rawRedirect) return NON_ADMIN_REDIRECT_URL

  try {
    const redirectUrl = new URL(rawRedirect)

    if (redirectUrl.origin === ALLOWED_APP_REDIRECT_ORIGIN) {
      return redirectUrl.toString()
    }
  } catch {
    return NON_ADMIN_REDIRECT_URL
  }

  return NON_ADMIN_REDIRECT_URL
}

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<"login" | "signup">("login")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [pendingAdminChoice, setPendingAdminChoice] = useState<{
    token: string
    provider: "email" | "google"
    isSignUp?: boolean
  } | null>(null)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState("")
  const [appRedirectUrl, setAppRedirectUrl] = useState(NON_ADMIN_REDIRECT_URL)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setAppRedirectUrl(getSafeAppRedirect(params.get("redirect")))
  }, [])

  const redirectNonAdmin = () => {
    window.location.assign(appRedirectUrl)
  }

  const routeAuthenticatedUser = async (
    user: User,
    options: { provider: "email" | "google"; isSignUp?: boolean }
  ) => {
    const token = await user.getIdToken(Boolean(options.isSignUp))

    try {
      await verifyAdminAccess(token)
      setPendingAdminChoice({
        token,
        provider: options.provider,
        isSignUp: options.isSignUp,
      })
      return
    } catch (adminError: unknown) {
      if (getErrorMessage(adminError, "") !== "Admin access denied") {
        throw adminError
      }
    }

    if (options.provider === "google") {
      await completeGoogleOnboarding(token)
    } else if (options.isSignUp) {
      await completeEmailOnboarding(token)
    }

    redirectNonAdmin()
  }

  const continueAsUser = async () => {
    if (!pendingAdminChoice) return

    try {
      setLoading(true)
      if (pendingAdminChoice.provider === "google") {
        await completeGoogleOnboarding(pendingAdminChoice.token)
      } else if (pendingAdminChoice.isSignUp) {
        await completeEmailOnboarding(pendingAdminChoice.token)
      }

      redirectNonAdmin()
    } catch (err: unknown) {
      console.error("User redirect error:", err)
      setError(getErrorMessage(err, "Failed to continue as user"))
      setPendingAdminChoice(null)
    } finally {
      setLoading(false)
    }
  }

  const continueAsAdmin = () => {
    setPendingAdminChoice(null)
    router.push("/dashboard")
  }

  const login = async () => {
    setError("")

    try {
      setLoading(true)
      const credential = await signInWithEmailAndPassword(auth, email, password)
      await routeAuthenticatedUser(credential.user, { provider: "email" })
    } catch (err: unknown) {
      console.error("Login error:", err)
      setError(getErrorMessage(err, "Invalid email or password"))
    } finally {
      setLoading(false)
    }
  }

  const signup = async () => {
    setError("")

    if (!name.trim() || !email.trim() || !password) {
      setError("Please enter your name, email, and password")
      return
    }

    try {
      setLoading(true)
      const credential = await createUserWithEmailAndPassword(auth, email, password)
      await updateProfile(credential.user, {
        displayName: name.trim(),
      })
      await routeAuthenticatedUser(credential.user, {
        provider: "email",
        isSignUp: true,
      })
    } catch (err: unknown) {
      console.error("Signup error:", err)
      setError(getErrorMessage(err, "Failed to create account"))
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
      await routeAuthenticatedUser(credential.user, { provider: "google" })
    } catch (err: unknown) {
      console.error("Google login error:", err)
      setError(getErrorMessage(err, "Google sign-in failed"))
    } finally {
      setGoogleLoading(false)
    }
  }

  const isBusy = loading || googleLoading

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-cyan-50/50 via-white to-white px-4 py-10">
      <div className="w-full max-w-md rounded-[32px] border border-[#0f7896]/14 bg-white p-8 shadow-[0_24px_70px_rgba(15,120,150,0.14)] space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-[#0f7896] to-[#1294ba] bg-clip-text text-transparent">
            Urologics
          </h1>
          <p className="text-lg font-bold text-[#071014]/58">
            Welcome
          </p>
        </div>

        <div className="grid grid-cols-2 rounded-2xl border border-[#0f7896]/14 bg-cyan-50 p-1">
          <button
            type="button"
            onClick={() => {
              setMode("login")
              setError("")
            }}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
              mode === "login"
                ? "bg-[#0f7896] text-white shadow-[0_8px_24px_rgba(15,120,150,0.22)]"
                : "text-[#071014]/55 hover:text-[#0f7896]"
            }`}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("signup")
              setError("")
            }}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
              mode === "signup"
                ? "bg-[#0f7896] text-white shadow-[0_8px_24px_rgba(15,120,150,0.22)]"
                : "text-[#071014]/55 hover:text-[#0f7896]"
            }`}
          >
            Sign up
          </button>
        </div>

        <div className="space-y-5">
          {mode === "signup" && (
            <div className="space-y-2">
              <label className="text-sm font-semibold text-[#071014]/68">Full name</label>
              <input
                type="text"
                placeholder="Dr. John Doe"
                className="w-full rounded-2xl border border-[#0f7896]/14 bg-cyan-50/60 px-4 py-3 text-[#071014] placeholder-[#071014]/35 focus:outline-none focus:ring-2 focus:ring-[#0f7896]/25"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-semibold text-[#071014]/68">Email</label>
            <input
              type="email"
              placeholder="admin@urologics.app"
              className="w-full rounded-2xl border border-[#0f7896]/14 bg-cyan-50/60 px-4 py-3 text-[#071014] placeholder-[#071014]/35 focus:outline-none focus:ring-2 focus:ring-[#0f7896]/25"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-[#071014]/68">Password</label>
            <input
              type="password"
              placeholder="Password"
              className="w-full rounded-2xl border border-[#0f7896]/14 bg-cyan-50/60 px-4 py-3 text-[#071014] placeholder-[#071014]/35 focus:outline-none focus:ring-2 focus:ring-[#0f7896]/25"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}
        </div>

        <Button
          onClick={mode === "login" ? login : signup}
          disabled={isBusy}
          className="w-full rounded-2xl bg-gradient-to-r from-[#0f7896] to-[#1294ba] py-6 text-base font-bold text-white shadow-[0_12px_36px_rgba(15,120,150,0.24)] hover:from-[#1294ba] hover:to-[#0f7896]"
        >
          {loading
            ? mode === "login"
              ? "Signing in..."
              : "Creating account..."
            : mode === "login"
              ? "Sign in"
              : "Create account"}
        </Button>

        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-[#0f7896]/14" />
          <span className="text-xs uppercase tracking-[0.2em] text-[#071014]/40">or</span>
          <div className="h-px flex-1 bg-[#0f7896]/14" />
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={loginWithGoogle}
          disabled={isBusy}
          className="w-full rounded-2xl border border-[#0f7896]/16 bg-white py-6 text-base font-bold text-[#071014] shadow-sm hover:border-[#0f7896]/30 hover:bg-cyan-50 hover:text-[#071014]"
        >
          {googleLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Continuing with Google...
            </>
          ) : (
            <>
              <Chrome className="h-4 w-4" />
              Continue with Google
            </>
          )}
        </Button>

        <p className="text-center text-xs text-[#071014]/45">
          Non-admin users continue to the app after authentication
        </p>
      </div>

      {pendingAdminChoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#071014]/55 px-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-[32px] border border-[#0f7896]/14 bg-white p-6 text-[#071014] shadow-[0_24px_70px_rgba(15,120,150,0.18)]">
            <div className="space-y-2 text-center">
              <h2 className="text-2xl font-extrabold text-[#0f7896]">
                Continue as
              </h2>
              <p className="text-sm text-[#071014]/58">
                This account has admin access. Choose where you want to go.
              </p>
            </div>

            <div className="mt-6 grid gap-3">
              <Button
                type="button"
                onClick={continueAsAdmin}
                disabled={isBusy}
                className="w-full rounded-2xl bg-gradient-to-r from-[#0f7896] to-[#1294ba] py-6 text-base font-bold text-white hover:from-[#1294ba] hover:to-[#0f7896]"
              >
                Admin dashboard
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={continueAsUser}
                disabled={isBusy}
                className="w-full rounded-2xl border border-[#0f7896]/16 bg-white py-6 text-base font-bold text-[#071014] hover:bg-cyan-50"
              >
                {loading ? "Opening app..." : "User app"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
