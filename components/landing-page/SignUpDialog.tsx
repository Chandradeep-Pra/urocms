"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
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
import { getFriendlyFirebaseAuthError } from "@/lib/firebaseAuthErrors";
import {
  defaultCountryValue,
  fallbackCountries,
  loadCountryOptions,
  splitCountryValue,
  type CountryOption,
} from "@/lib/countryOptions";
import { completeSignupProfile } from "@/lib/signupCompletion";
import { setSignupAutoRouteSuppressed } from "@/lib/testingZoneAuthHandoff";

const CONFIGURED_USER_APP_URL = process.env.NEXT_PUBLIC_USER_APP_URL || "/web";
const USER_APP_URL = CONFIGURED_USER_APP_URL.includes("testing-zone-five.vercel.app")
  ? "/web"
  : CONFIGURED_USER_APP_URL;

function getPhoneDigits(value: string) {
  return value.replace(/\D/g, "");
}

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
  const [countryPickerOpen, setCountryPickerOpen] = useState(false);
  const [countriesLoading, setCountriesLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [profileCreated, setProfileCreated] = useState(false);
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
    setProfileCreated(false);
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !password || !name.trim() || !phone || !medicalInstitution.trim()) {
      setError("Please fill in all fields");
      return;
    }

    if (getPhoneDigits(phone).length !== 10) {
      setError("Phone number should be exactly 10 digits");
      return;
    }

    try {
      setLoading(true);
      setSignupAutoRouteSuppressed(true);
      const [{ createUserWithEmailAndPassword, signOut, updateProfile }, { auth }] =
        await Promise.all([import("firebase/auth"), import("@/lib/firebaseClient")]);
      const credential = await createUserWithEmailAndPassword(auth, normalizedEmail, password);

      await updateProfile(credential.user, {
        displayName: name.trim(),
      });

      const token = await credential.user.getIdToken(true);
      await completeSignupProfile({
        idToken: token,
        name: name.trim(),
        country: selectedCountry.country,
        phone: fullPhone,
        medicalInstitution: medicalInstitution.trim(),
      });

      await signOut(auth);
      setProfileCreated(true);
      setPassword("");
      setPhone("");
      setMedicalInstitution("");
      setCountryPickerOpen(false);
    } catch (err: unknown) {
      console.error("Sign up error:", err);
      setError(getFriendlyFirebaseAuthError(err, "Failed to create account. Please try again."));
    } finally {
      setSignupAutoRouteSuppressed(false);
      setLoading(false);
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

        {profileCreated ? (
          <div className="mt-5 rounded-[26px] border border-[#0f7896]/14 bg-cyan-50/70 p-5 text-center">
            <h3 className="text-xl font-extrabold text-[#0f7896]">Profile created</h3>
            <p className="mt-2 text-sm leading-6 text-[#071014]/62">
              Your Urologics profile has been created successfully. Please login to continue to the platform.
            </p>
            <Button
              type="button"
              onClick={() => window.location.assign(`/login?redirect=${encodeURIComponent(USER_APP_URL)}`)}
              className="mt-5 w-full rounded-2xl bg-[#0f7896] py-6 text-base font-bold text-white shadow-[0_12px_36px_rgba(15,120,150,0.24)] hover:bg-[#1294ba]"
            >
              Login to continue
            </Button>
          </div>
        ) : (
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

          <div className="space-y-2">
            <Label htmlFor="signup-phone" className="text-[#071014]/68">
              Phone Number
            </Label>
            <div className="relative">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setCountryPickerOpen((current) => !current)}
                  className="flex h-12 min-w-24 items-center justify-center gap-2 rounded-2xl border border-[#0f7896]/14 bg-cyan-50/60 px-3 text-sm font-bold text-[#071014] transition hover:border-[#0f7896]/30 hover:bg-cyan-50"
                  aria-label="Choose country code"
                >
                  {selectedCountry.dialCode}
                  <ChevronDown className={`h-4 w-4 transition ${countryPickerOpen ? "rotate-180" : ""}`} />
                </button>
                <Input
                  id="signup-phone"
                  type="tel"
                  placeholder="98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(getPhoneDigits(e.target.value).slice(0, 10))}
                  className="h-12 rounded-2xl border-[#0f7896]/14 bg-cyan-50/60 text-[#071014] placeholder-[#071014]/35 focus-visible:ring-[#0f7896]/25"
                />
              </div>

              {countryPickerOpen ? (
                <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-[80] overflow-hidden rounded-[24px] border border-[#0f7896]/14 bg-white shadow-[0_24px_70px_rgba(15,120,150,0.18)]">
                  <div className="border-b border-[#0f7896]/10 bg-cyan-50/70 p-3">
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#0f7896]" />
                      <Input
                        value={countrySearch}
                        onChange={(event) => setCountrySearch(event.target.value)}
                        placeholder="Search country or code"
                        className="h-11 rounded-2xl border-[#0f7896]/14 bg-white pl-10 text-[#071014] placeholder-[#071014]/35 focus-visible:ring-[#0f7896]/25"
                      />
                    </div>
                  </div>

                  <div className="max-h-80 overflow-y-auto p-2">
                    {countriesLoading ? (
                      <div className="rounded-2xl px-4 py-3 text-sm font-semibold text-[#0f7896]">
                        Loading countries...
                      </div>
                    ) : visibleCountries.length === 0 ? (
                      <div className="rounded-2xl px-4 py-3 text-sm text-[#071014]/55">
                        No country found.
                      </div>
                    ) : (
                      visibleCountries.map((country) => {
                        const parsed = splitCountryValue(country.value);
                        const selected = country.value === countryValue;

                        return (
                          <button
                            key={`${country.label}-${country.value}`}
                            type="button"
                            onClick={() => {
                              setCountryValue(country.value);
                              setCountryPickerOpen(false);
                              setCountrySearch("");
                            }}
                            className={`flex w-full items-center justify-between gap-3 rounded-2xl px-4 py-3 text-left text-sm transition ${
                              selected
                                ? "bg-[#0f7896] font-bold text-white"
                                : "text-[#071014] hover:bg-cyan-50"
                            }`}
                          >
                            <span className="truncate">{parsed.country}</span>
                            <span className={selected ? "text-white" : "font-bold text-[#0f7896]"}>
                              {parsed.dialCode}
                            </span>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              ) : null}
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
            disabled={loading}
            className="w-full rounded-2xl bg-[#0f7896] py-6 text-base font-bold text-white shadow-[0_12px_36px_rgba(15,120,150,0.24)] hover:bg-[#1294ba]"
          >
            {loading ? "Creating account..." : "Sign Up"}
          </Button>
        </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
