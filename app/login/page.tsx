"use client"

import { LogoutButton } from "@/components/LogoutButton"
import { Button } from "@/components/ui/button"
import {
  splitCountryValue,
} from "@/lib/countryOptions"
import { usePortalRole } from "@/lib/usePortalRole"
import { auth } from "@/lib/firebaseClient"
import { getFriendlyFirebaseAuthError } from "@/lib/firebaseAuthErrors"
import { completeSignupProfile } from "@/lib/signupCompletion"
import {
  consumeRecentLogoutFlag,
  setSignupAutoRouteSuppressed,
  syncTestingZoneAuth,
} from "@/lib/testingZoneAuthHandoff"
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
  signInWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
  type User,
} from "firebase/auth"
import { Loader2 } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"

import Image from "next/image"
import SignupFields from "@/components/auth/SignupFields"
import PasswordInput from "@/components/auth/PasswordInput"
import { validateSignup, type SignupErrors } from "@/lib/signupValidation"

async function verifyAdminAccess(idToken: string) {
  const params = new URLSearchParams(window.location.search)
  const next = params.get("next") ?? params.get("redirect") ?? params.get("callbackUrl") ?? params.get("redirectTo") ?? params.get("returnTo") ?? ""
  const response = await fetch(`/api/auth/role?next=${encodeURIComponent(next)}`, {
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${idToken}`,
    },
  })

  const data = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(data?.error || "Failed to verify account role")
  }

  return data as { isAdmin: boolean; destination: string; studentDestination: string }
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
  return getFriendlyFirebaseAuthError(error, fallback)
}

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "signup">("login")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [countryValue, setCountryValue] = useState("")
  const [phone, setPhone] = useState("")
  const [medicalInstitution, setMedicalInstitution] = useState("")
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [authUser, setAuthUser] = useState<User | null>(null)
  const portalRole = usePortalRole(authUser)
  const signupInProgressRef = useRef(false)
  const selectedCountry = splitCountryValue(countryValue)
  const fullPhone = phone.trim() ? `${selectedCountry.dialCode} ${phone.trim()}` : ""
  const [fieldErrors, setFieldErrors] = useState<SignupErrors>({})
  const autoRouteUserRef = useRef<string | null>(null)
  const signupValues = { name, email, password, confirmPassword, countryValue, phone, medicalInstitution }

  const routeAuthenticatedUser = useCallback(async (
    user: User,
    options: { provider: "email" | "google"; isSignUp?: boolean; student?: boolean }
  ) => {
    const token = await user.getIdToken(Boolean(options.isSignUp))

    const role = await verifyAdminAccess(token)
    if (auth.currentUser?.uid !== user.uid) return
    if (role.isAdmin && !options.student) {
      window.location.assign(role.destination)
      return
    }

    if (options.provider === "google") {
      await completeGoogleOnboarding(token)
    } else if (options.isSignUp) {
      await completeEmailOnboarding(token)
    }

    await syncTestingZoneAuth(user, token)
    window.location.assign(role.studentDestination || "/web")
  }, [])

  useEffect(() => {
    let cancelled = false
    let shouldForceLogout = consumeRecentLogoutFlag()

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (signupInProgressRef.current) return
      const forceLogout = shouldForceLogout
      shouldForceLogout = false
      if (forceLogout && user) {
        void signOut(auth)
        return
      }
      if (!cancelled) {
        setAuthUser(user)
      }
    })

    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [])

  const continueToPortal = async (student = false) => {
    if (!authUser || isBusy) return
    setError("")
    try {
      setLoading(true)
      await routeAuthenticatedUser(authUser, {
        student,
        provider: authUser.providerData.some((provider) => provider.providerId === "google.com") ? "google" : "email",
      })
    } catch (err) {
      setError(getErrorMessage(err, "Failed to open portal"))
    } finally {
      setLoading(false)
    }
  }

  const login = async () => {
    setError("")
    setSuccess("")
    const normalizedEmail = email.trim().toLowerCase()
    if (!normalizedEmail || !password) { setError(!normalizedEmail ? "Enter your email address." : "Enter your password."); return }

    try {
      setLoading(true)
      const credential = await signInWithEmailAndPassword(auth, normalizedEmail, password)
      setAuthUser(credential.user)
      setPassword("")
    } catch (err: unknown) {
      console.error("Login error:", err)
      setError(getErrorMessage(err, "Invalid email or password"))
    } finally {
      setLoading(false)
    }
  }

  const sendPasswordReset = async () => {
    setError("")
    setSuccess("")
    const normalizedEmail = email.trim().toLowerCase()

    if (!normalizedEmail) {
      setError("Please enter your email first")
      return
    }

    try {
      setResetLoading(true)
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: normalizedEmail }),
      })
      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(payload?.error || "Unable to send password reset email")
      }

      setSuccess(payload?.message || "If an account exists, a password reset email has been sent.")
    } catch (err: unknown) {
      console.error("Forgot password error:", err)
      setError(getErrorMessage(err, "Unable to send password reset email"))
    } finally {
      setResetLoading(false)
    }
  }

  const signup = async () => {
    setError("")
    setSuccess("")
    const normalizedEmail = email.trim().toLowerCase()

    const validation = validateSignup(signupValues)
    setFieldErrors(validation)
    if (Object.keys(validation).length) return

    try {
      setLoading(true)
      signupInProgressRef.current = true
      setSignupAutoRouteSuppressed(true)
      const credential = await createUserWithEmailAndPassword(auth, normalizedEmail, password)
      await updateProfile(credential.user, {
        displayName: name.trim(),
      })
      const token = await credential.user.getIdToken(true)
      await completeSignupProfile({
        idToken: token,
        name: name.trim(),
        phone: fullPhone,
        country: selectedCountry.country,
        medicalInstitution: medicalInstitution.trim(),
      })
      await signOut(auth)
      setMode("login")
      setPassword("")
      setConfirmPassword("")
      setPhone("")
      setMedicalInstitution("")
      setSuccess("Your profile has been created successfully. Please login to continue.")
    } catch (err: unknown) {
      console.error("Signup error:", err)
      setError(getErrorMessage(err, "Failed to create account"))
    } finally {
      signupInProgressRef.current = false
      setSignupAutoRouteSuppressed(false)
      setLoading(false)
    }
  }

  const loginWithGoogle = async () => {
    setError("")
    setSuccess("")

    try {
      setGoogleLoading(true)
      const provider = new GoogleAuthProvider()
      provider.setCustomParameters({
        prompt: "select_account",
      })

      const credential = await signInWithPopup(auth, provider)
      setAuthUser(credential.user)
    } catch (err: unknown) {
      console.error("Google login error:", err)
      setError(getErrorMessage(err, "Google sign-in failed"))
    } finally {
      setGoogleLoading(false)
    }
  }

  const isBusy = loading || googleLoading

  useEffect(() => {
    if (!authUser) { autoRouteUserRef.current = null; return }
    if (portalRole.checking || portalRole.error || portalRole.isAdmin !== false || isBusy || signupInProgressRef.current || autoRouteUserRef.current === authUser.uid) return
    autoRouteUserRef.current = authUser.uid
    setLoading(true)
    void routeAuthenticatedUser(authUser, { provider: authUser.providerData.some(provider => provider.providerId === "google.com") ? "google" : "email" })
      .catch(err => setError(getErrorMessage(err, "Unable to open your account. Please retry.")))
      .finally(() => setLoading(false))
  }, [authUser, portalRole.checking, portalRole.error, portalRole.isAdmin, isBusy, routeAuthenticatedUser])

  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-[#f3f5f7] p-3 text-[#102b48] sm:p-6">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-3xl border border-[#0d2a48]/10 bg-white shadow-xl md:min-h-[620px] md:grid-cols-[0.9fr_1.1fr] lg:h-[min(760px,calc(100dvh-48px))]">
        <section className="flex flex-col items-center justify-center bg-[#082443] px-8 py-6 text-center md:p-10">
          <Image src="/logo.png" alt="Urologics — Dr Ankit Goel" width={500} height={500} priority className="h-24 w-24 object-contain md:h-auto md:w-full md:max-w-[330px]" />
          <p className="mt-6 hidden text-sm tracking-wide text-[#e5d481] md:block">Your next chapter in urology.</p>
        </section>
        <section className="min-w-0 overflow-y-auto px-5 py-6 sm:px-9 md:flex md:flex-col md:py-8">
          <div className="mx-auto my-auto w-full max-w-md space-y-5">
            <header><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9a7a26]">Welcome to Urologics</p><h1 className="mt-2 text-2xl font-semibold tracking-tight">{authUser ? "Welcome back" : mode === "login" ? "Sign in to your account" : "Create your account"}</h1></header>
            {!authUser ? <>
              <div className="grid grid-cols-2 rounded-xl bg-slate-100 p-1" aria-label="Account options">
                {(["login", "signup"] as const).map(option => <button key={option} type="button" onClick={() => { setMode(option); setError(""); setSuccess(""); setFieldErrors({}) }} className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${mode === option ? "bg-[#0b2948] text-white shadow-sm" : "text-slate-500 hover:text-[#0b2948]"}`}>{option === "login" ? "Sign in" : "Sign up"}</button>)}
              </div>
              <form noValidate onSubmit={event => { event.preventDefault(); void (mode === "login" ? login() : signup()) }} className="space-y-4">
                {mode === "signup" ? <SignupFields values={signupValues} errors={fieldErrors} disabled={isBusy} onChange={values => { setName(values.name); setEmail(values.email); setPassword(values.password); setConfirmPassword(values.confirmPassword); setCountryValue(values.countryValue); setPhone(values.phone); setMedicalInstitution(values.medicalInstitution); setFieldErrors(current => Object.keys(current).length ? validateSignup(values) : current); }} /> : <>
                  <div><label htmlFor="login-email" className="mb-1.5 block text-sm font-medium">Email</label><input id="login-email" type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="doctor@example.com" className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-[#c5a54d] focus:ring-2 focus:ring-[#c5a54d]/20" /></div>
                  <div><div className="mb-1.5 flex items-center justify-between"><label htmlFor="login-password" className="text-sm font-medium">Password</label><button type="button" onClick={sendPasswordReset} disabled={resetLoading || isBusy} className="text-xs font-medium text-[#8b6b20] hover:underline">{resetLoading ? "Sending..." : "Forgot password?"}</button></div><PasswordInput id="login-password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} /></div>
                </>}
                {success && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{success}</p>}
                {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
                <Button type="submit" disabled={isBusy} className="h-12 w-full rounded-xl bg-[#0b2948] px-4 py-3 text-sm font-semibold text-white hover:bg-[#153e63]">{loading ? <Loader2 size={18} className="animate-spin" /> : null}{loading ? mode === "login" ? "Signing in..." : "Creating account..." : mode === "login" ? "Sign in" : "Create account"}</Button>
              </form>
              {mode === "login" && <><div className="flex items-center gap-3 text-xs text-slate-400"><span className="h-px flex-1 bg-slate-200" />or<span className="h-px flex-1 bg-slate-200" /></div>
                <Button type="button" variant="outline" onClick={loginWithGoogle} disabled={isBusy} className="h-12 w-full rounded-xl border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-[#102b48] hover:bg-slate-50">
                  {googleLoading ? <Loader2 size={18} className="animate-spin" /> : <svg aria-hidden="true" viewBox="0 0 48 48" className="h-5 w-5 shrink-0"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z" /><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65Z" /><path fill="#FBBC05" d="M10.53 28.59A14.41 14.41 0 0 1 9.75 24c0-1.59.27-3.13.76-4.59l-7.98-6.19A23.87 23.87 0 0 0 0 24c0 3.87.93 7.53 2.56 10.78l7.97-6.19Z" /><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.91-5.8l-7.73-6c-2.15 1.45-4.92 2.3-8.18 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z" /></svg>}
                  {googleLoading ? "Connecting..." : "Continue with Google"}
                </Button></>}
            </> : <div className="space-y-4">
              <p className="break-words text-sm text-slate-600">Signed in as {authUser.email}</p>
              {(error || portalRole.error) && <p role="alert" className="text-sm text-red-700">{error || portalRole.error}</p>}
              {portalRole.isAdmin ? <div className="flex flex-wrap gap-3"><Button disabled={isBusy} onClick={() => continueToPortal()} className="h-12 flex-1 bg-[#0b2948] hover:bg-[#153e63]">Continue as Admin</Button><Button variant="outline" disabled={isBusy} onClick={() => continueToPortal(true)} className="h-12">Student portal</Button></div> : error || portalRole.error ? <Button onClick={() => portalRole.error ? portalRole.retry() : continueToPortal()} disabled={isBusy}>Retry</Button> : <p role="status" className="flex items-center gap-2 text-sm"><Loader2 size={18} className="animate-spin" />{portalRole.checking ? "Checking account..." : "Opening your account..."}</p>}
              <LogoutButton disabled={isBusy} />
            </div>}
          </div>
        </section>
      </div>
    </main>
  )
}
