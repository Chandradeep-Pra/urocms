from pathlib import Path
p = Path('app/login/page.tsx')
s = p.read_text(encoding='utf-8')
s = s.replace('  defaultCountryValue,\n  fallbackCountries,\n  loadCountryOptions,\n', '').replace('  type CountryOption,\n', '')
s = s.replace('import { Loader2 }', 'import { Loader2 }')
s = s.replace('useEffect, useMemo, useRef, useState', 'useCallback, useEffect, useRef, useState')
s = s.replace('\n\nasync function verifyAdminAccess', '\nimport Image from "next/image"\nimport SignupFields from "@/components/auth/SignupFields"\nimport PasswordInput from "@/components/auth/PasswordInput"\nimport { validateSignup, type SignupErrors } from "@/lib/signupValidation"\n\nasync function verifyAdminAccess', 1)
s = s.replace('useState(defaultCountryValue)', 'useState("")')
for line in ['  const [countries, setCountries] = useState<CountryOption[]>(fallbackCountries)\n', '  const [countrySearch, setCountrySearch] = useState("")\n', '  const [countriesLoading, setCountriesLoading] = useState(false)\n']:
    s = s.replace(line, '')
a=s.index('  const visibleCountries = useMemo(')
b=s.index('  const redirectNonAdmin',a)
s=s[:a]+'''  const fullPhone = phone.trim() ? `${selectedCountry.dialCode} ${phone.trim()}` : ""
  const [fieldErrors, setFieldErrors] = useState<SignupErrors>({})
  const autoRouteUserRef = useRef<string | null>(null)
  const signupValues = { name, email, password, confirmPassword, countryValue, phone, medicalInstitution }

'''+s[b:]
s=s.replace('  const routeAuthenticatedUser = async (', '  const routeAuthenticatedUser = useCallback(async (')
s=s.replace('    redirectNonAdmin("/web")\n  }', '    redirectNonAdmin(role.studentDestination || "/web")\n  }, [])')
a=s.index('    if (\n      !name.trim()')
b=s.index('\n    try {',a)
s=s[:a]+'''    const validation = validateSignup(signupValues)
    setFieldErrors(validation)
    if (Object.keys(validation).length) return
'''+s[b:]
s=s.replace('    const normalizedEmail = email.trim().toLowerCase()\n\n    try {\n      setLoading(true)\n      const credential = await signInWithEmailAndPassword', '''    const normalizedEmail = email.trim().toLowerCase()
    if (!normalizedEmail || !password) { setError(!normalizedEmail ? "Enter your email address." : "Enter your password."); return }

    try {
      setLoading(true)
      const credential = await signInWithEmailAndPassword''', 1)
a=s.index('  return (\n    <div className="min-h-screen')
s=s[:a]+'''  useEffect(() => {
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
        <section className="min-w-0 overflow-y-auto px-5 py-6 sm:px-9 md:flex md:flex-col md:justify-center md:py-8">
          <div className="mx-auto w-full max-w-md space-y-5">
            <header><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9a7a26]">Welcome to Urologics</p><h1 className="mt-2 text-2xl font-semibold tracking-tight">{authUser ? "Welcome back" : mode === "login" ? "Sign in to your account" : "Create your account"}</h1></header>
            {!authUser ? <>
              <div className="grid grid-cols-2 rounded-xl bg-slate-100 p-1" aria-label="Account options">
                {(["login", "signup"] as const).map(option => <button key={option} type="button" onClick={() => { setMode(option); setError(""); setSuccess(""); setFieldErrors({}) }} className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${mode === option ? "bg-[#0b2948] text-white shadow-sm" : "text-slate-500 hover:text-[#0b2948]"}`}>{option === "login" ? "Sign in" : "Sign up"}</button>)}
              </div>
              <form noValidate onSubmit={event => { event.preventDefault(); void (mode === "login" ? login() : signup()) }} className="space-y-4">
                {mode === "signup" ? <SignupFields values={signupValues} errors={fieldErrors} disabled={isBusy} onChange={values => { setName(values.name); setEmail(values.email); setPassword(values.password); setConfirmPassword(values.confirmPassword); setCountryValue(values.countryValue); setPhone(values.phone); setMedicalInstitution(values.medicalInstitution); }} /> : <>
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
'''
# getPhoneDigits is now handled by the shared signup fields.
a=s.index('function getPhoneDigits(')
b=s.index('export default function LoginPage()',a)
s=s[:a]+s[b:]
p.write_text(s,encoding='utf-8')
