"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import SignupFields from "@/components/auth/SignupFields";
import { emptySignup, validateSignup, type SignupErrors } from "@/lib/signupValidation";
import { splitCountryValue } from "@/lib/countryOptions";
import { completeSignupProfile } from "@/lib/signupCompletion";
import { setSignupAutoRouteSuppressed } from "@/lib/testingZoneAuthHandoff";
import { getFriendlyFirebaseAuthError } from "@/lib/firebaseAuthErrors";

export function SignUpDialog({ children, controlledOpen, onControlledOpenChange }: { children?: React.ReactNode; controlledOpen?: boolean; onControlledOpenChange?: (open: boolean) => void }) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [values, setValues] = useState(emptySignup);
  const [errors, setErrors] = useState<SignupErrors>({});
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const validation = validateSignup(values);
    setErrors(validation); setError("");
    if (Object.keys(validation).length) return;
    setLoading(true); setSignupAutoRouteSuppressed(true);
    try {
      const [{ createUserWithEmailAndPassword, signOut, updateProfile }, { auth }] = await Promise.all([import("firebase/auth"), import("@/lib/firebaseClient")]);
      const credential = await createUserWithEmailAndPassword(auth, values.email.trim().toLowerCase(), values.password);
      await updateProfile(credential.user, { displayName: values.name.trim() });
      const country = splitCountryValue(values.countryValue);
      await completeSignupProfile({ idToken: await credential.user.getIdToken(true), name: values.name.trim(), phone: `${country.dialCode} ${values.phone}`, country: country.country, medicalInstitution: values.medicalInstitution.trim() });
      await signOut(auth); setCreated(true); setValues(emptySignup);
    } catch (error) { setError(getFriendlyFirebaseAuthError(error, "Unable to create your account.")); }
    finally { setLoading(false); setSignupAutoRouteSuppressed(false); }
  }
  return <Dialog open={controlledOpen ?? internalOpen} onOpenChange={onControlledOpenChange ?? setInternalOpen}>
    {children && <DialogTrigger asChild>{children}</DialogTrigger>}
    <DialogContent className="max-h-[90dvh] overflow-y-auto rounded-3xl bg-white p-6 text-[#102b48] sm:max-w-xl">
      <DialogHeader><DialogTitle className="text-2xl font-semibold">Join Urologics</DialogTitle></DialogHeader>
      {created ? <div className="space-y-4 py-4"><p className="text-sm text-slate-600">Your profile has been created. Sign in to continue.</p><Button className="h-12 w-full bg-[#0b2948] text-white hover:bg-[#153e63]" onClick={() => window.location.assign("/login?redirect=%2Fweb")}>Sign in</Button></div> : <form noValidate onSubmit={submit} className="space-y-5"><SignupFields values={values} onChange={next => { setValues(next); setErrors(current => Object.keys(current).length ? validateSignup(next) : current); }} errors={errors} disabled={loading} prefix="join" />{error && <p role="alert" className="text-sm text-red-700">{error}</p>}<Button type="submit" disabled={loading} className="h-12 w-full rounded-xl bg-[#0b2948] font-semibold text-white hover:bg-[#153e63]">{loading ? "Creating account..." : "Create account"}</Button></form>}
    </DialogContent>
  </Dialog>;
}
