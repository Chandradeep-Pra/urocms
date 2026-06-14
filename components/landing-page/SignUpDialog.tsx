"use client";

import { useEffect, useMemo, useState } from "react";
import { Chrome, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  defaultCountryValue,
  fallbackCountries,
  loadCountryOptions,
  splitCountryValue,
  type CountryOption,
} from "@/lib/countryOptions";
import { completeSignupProfile } from "@/lib/signupCompletion";
import { syncTestingZoneAuth } from "@/lib/testingZoneAuthHandoff";

const CONFIGURED_USER_APP_URL = process.env.NEXT_PUBLIC_USER_APP_URL || "/web";
const USER_APP_URL = CONFIGURED_USER_APP_URL.includes("testing-zone-five.vercel.app")
  ? "/web"
  : CONFIGURED_USER_APP_URL;

export function SignUpDialog({
  children,
  controlledOpen,
  onControlledOpenChange,
}: {
  children?: React.ReactNode;
  controlledOpen?: boolean;
  onControlledOpenChange?: (open: boolean) => void;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [countryValue, setCountryValue] = useState(defaultCountryValue);
  const [phone, setPhone] = useState("");
  const [medicalInstitution, setMedicalInstitution] = useState("");
  const [countries, setCountries] = useState<CountryOption[]>(fallbackCountries);
  const [countrySearch, setCountrySearch] = useState("");
  const [countriesLoading, setCountriesLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const open = controlledOpen ?? internalOpen;
  const setOpen = onControlledOpenChange ?? setInternalOpen;
  const selectedCountry = useMemo(() => splitCountryValue(countryValue), [countryValue]);
  const visibleCountries = useMemo(() => {
    const search = countrySearch.trim().toLowerCase();
    if (!search) return countries;

    return countries.filter((country) => country.label.toLowerCase().includes(search));
  }, [countries, countrySearch]);
  const fullPhone = phone.trim()
    ? `${selectedCountry.dialCode} ${phone.trim()}`.trim()
    : "";

  useEffect(() => {
    if (!open) return;

    let active = true;

    async function hydrateCountries() {
      try {
        setCountriesLoading(true);
        const nextCountries = await loadCountryOptions();
        if (active) setCountries(nextCountries);
      } catch {
        if (active) setCountries(fallbackCountries);
      } finally {
        if (active) setCountriesLoading(false);
      }
    }

    void hydrateCountries();

    return () => {
      active = false;
    };
  }, [open]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !password || !name || !phone || !medicalInstitution) {
      setError("Please fill in all fields");
      return;
    }

    try {
      setLoading(true);
      const [{ createUserWithEmailAndPassword, updateProfile }, { auth }] =
        await Promise.all([import("firebase/auth"), import("@/lib/firebaseClient")]);
      const credential = await createUserWithEmailAndPassword(auth, email, password);

      await updateProfile(credential.user, {
        displayName: name,
      });

      const token = await credential.user.getIdToken(true);
      await completeSignupProfile({
        idToken: token,
        name: name.trim(),
        country: selectedCountry.country,
        phone: fullPhone,
        medicalInstitution: medicalInstitution.trim(),
      });

      await syncTestingZoneAuth(credential.user, token);
      setOpen(false);
      window.location.assign(USER_APP_URL);
    } catch (err: unknown) {
      console.error("Sign up error:", err);
      setError(err instanceof Error ? err.message : "Failed to create account");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setError("");
    try {
      setGoogleLoading(true);
      const [{ GoogleAuthProvider, signInWithPopup }, { auth }] =
        await Promise.all([import("firebase/auth"), import("@/lib/firebaseClient")]);
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({
        prompt: "select_account",
      });

      const credential = await signInWithPopup(auth, provider);
      const token = await credential.user.getIdToken();
      const response = await fetch("/api/auth/google/complete", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.error || "Failed to finalize Google sign-up");
      }

      await syncTestingZoneAuth(credential.user, token);
      setOpen(false);
      window.location.assign(USER_APP_URL);
    } catch (err: unknown) {
      console.error("Google sign up error:", err);
      setError(err instanceof Error ? err.message : "Google sign-up failed");
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {children ? <DialogTrigger asChild>{children}</DialogTrigger> : null}
      <DialogContent className="sm:max-w-md rounded-[32px] border border-[#0f7896]/14 bg-white p-6 text-[#071014] shadow-[0_24px_70px_rgba(15,120,150,0.18)]">
        <DialogHeader>
          <DialogTitle className="text-center text-3xl font-extrabold tracking-tight text-[#0f7896]">
            Join Urologics
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSignUp} className="mt-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-[#071014]/68">
              Full Name
            </Label>
            <Input
              id="name"
              placeholder="Dr. John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-12 rounded-2xl border-[#0f7896]/14 bg-cyan-50/60 text-[#071014] placeholder-[#071014]/35 focus-visible:ring-[#0f7896]/25"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="text-[#071014]/68">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="doctor@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-12 rounded-2xl border-[#0f7896]/14 bg-cyan-50/60 text-[#071014] placeholder-[#071014]/35 focus-visible:ring-[#0f7896]/25"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-[#071014]/68">
              Password
            </Label>
            <Input
              id="password"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-12 rounded-2xl border-[#0f7896]/14 bg-cyan-50/60 text-[#071014] placeholder-[#071014]/35 focus-visible:ring-[#0f7896]/25"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-[0.9fr_1.1fr]">
            <div className="space-y-2">
              <Label htmlFor="signup-country" className="text-[#071014]/68">
                Country
              </Label>
              <Input
                value={countrySearch}
                onChange={(event) => setCountrySearch(event.target.value)}
                placeholder="Search country or code"
                className="h-10 rounded-2xl border-[#0f7896]/14 bg-white text-[#071014] placeholder-[#071014]/35 focus-visible:ring-[#0f7896]/25"
              />
              <select
                id="signup-country"
                value={countryValue}
                onChange={(event) => setCountryValue(event.target.value)}
                className="h-12 w-full rounded-2xl border border-[#0f7896]/14 bg-cyan-50/60 px-4 text-sm text-[#071014] focus:outline-none focus:ring-2 focus:ring-[#0f7896]/25"
              >
                {visibleCountries.map((country) => (
                  <option key={`${country.label}-${country.value}`} value={country.value}>
                    {country.label}
                  </option>
                ))}
              </select>
              {countriesLoading ? (
                <p className="text-xs text-[#071014]/45">Loading country codes...</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="signup-phone" className="text-[#071014]/68">
                Phone Number
              </Label>
              <div className="flex gap-2">
                <div className="grid h-12 w-20 place-items-center rounded-2xl border border-[#0f7896]/14 bg-cyan-50/60 text-sm font-bold text-[#071014]">
                  {selectedCountry.dialCode}
                </div>
                <Input
                  id="signup-phone"
                  type="tel"
                  placeholder="98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="h-12 rounded-2xl border-[#0f7896]/14 bg-cyan-50/60 text-[#071014] placeholder-[#071014]/35 focus-visible:ring-[#0f7896]/25"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="medicalInstitution" className="text-[#071014]/68">
              Medical Institution
            </Label>
            <Input
              id="medicalInstitution"
              placeholder="NHS Trust, hospital, medical college..."
              value={medicalInstitution}
              onChange={(e) => setMedicalInstitution(e.target.value)}
              className="h-12 rounded-2xl border-[#0f7896]/14 bg-cyan-50/60 text-[#071014] placeholder-[#071014]/35 focus-visible:ring-[#0f7896]/25"
            />
          </div>

          {error ? <p className="text-sm text-red-500">{error}</p> : null}

          <Button
            type="submit"
            disabled={loading || googleLoading}
            className="w-full rounded-2xl bg-[#0f7896] py-6 text-base font-bold text-white shadow-[0_12px_36px_rgba(15,120,150,0.24)] hover:bg-[#1294ba]"
          >
            {loading ? "Creating account..." : "Sign Up"}
          </Button>
        </form>

        <div className="my-4 flex items-center gap-3">
          <div className="h-px flex-1 bg-[#0f7896]/14" />
          <span className="text-xs uppercase tracking-[0.2em] text-[#071014]/40">or</span>
          <div className="h-px flex-1 bg-[#0f7896]/14" />
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={handleGoogleSignUp}
          disabled={loading || googleLoading}
          className="w-full rounded-2xl border border-[#0f7896]/16 bg-white py-6 text-base font-bold text-[#071014] shadow-sm hover:border-[#0f7896]/30 hover:bg-cyan-50 hover:text-[#071014]"
        >
          {googleLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Signing up with Google...
            </>
          ) : (
            <>
              <Chrome className="mr-2 h-4 w-4" />
              Continue with Google
            </>
          )}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
