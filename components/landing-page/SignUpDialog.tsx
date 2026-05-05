"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Chrome, Loader2 } from "lucide-react";
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile,
} from "firebase/auth";
import { auth } from "@/lib/firebaseClient";

export function SignUpDialog({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (!email || !password || !name) {
      setError("Please fill in all fields");
      return;
    }

    try {
      setLoading(true);
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      
      await updateProfile(credential.user, {
        displayName: name,
      });

      const token = await credential.user.getIdToken();
      
      // Hit validate-user to create the user document in Firestore with 'free' tier
      const response = await fetch("/api/validate-user", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to initialize user profile");
      }

      setOpen(false);
      router.push("/dashboard");
    } catch (err: any) {
      console.error("Sign up error:", err);
      setError(err?.message || "Failed to create account");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setError("");
    try {
      setGoogleLoading(true);
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({
        prompt: "select_account",
      });

      const credential = await signInWithPopup(auth, provider);
      const token = await credential.user.getIdToken();

      // Use the existing Google complete API which handles Firestore user creation/merging
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

      setOpen(false);
      router.push("/dashboard");
    } catch (err: any) {
      console.error("Google sign up error:", err);
      setError(err?.message || "Google sign-up failed");
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-[#111816] border border-emerald-900/40 text-white shadow-2xl shadow-emerald-500/20">
        <DialogHeader>
          <DialogTitle className="text-2xl font-extrabold tracking-tight text-emerald-400 text-center">
            Join Urologics
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSignUp} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-slate-400">Full Name</Label>
            <Input
              id="name"
              placeholder="Dr. John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-[#0d1412] border-emerald-900/40 text-white placeholder-slate-500 focus-visible:ring-emerald-500/40"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="text-slate-400">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="doctor@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-[#0d1412] border-emerald-900/40 text-white placeholder-slate-500 focus-visible:ring-emerald-500/40"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-slate-400">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-[#0d1412] border-emerald-900/40 text-white placeholder-slate-500 focus-visible:ring-emerald-500/40"
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <Button
            type="submit"
            disabled={loading || googleLoading}
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-black rounded-xl py-6 font-semibold shadow-lg shadow-emerald-500/30"
          >
            {loading ? "Creating account..." : "Sign Up"}
          </Button>
        </form>

        <div className="flex items-center gap-3 my-4">
          <div className="h-px flex-1 bg-emerald-900/40" />
          <span className="text-xs uppercase tracking-[0.2em] text-slate-500">or</span>
          <div className="h-px flex-1 bg-emerald-900/40" />
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={handleGoogleSignUp}
          disabled={loading || googleLoading}
          className="w-full rounded-xl border border-white/10 bg-white/[0.03] py-6 text-base font-semibold text-black hover:bg-white/[0.07] hover:text-black"
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
