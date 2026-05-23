"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Chrome, Loader2 } from "lucide-react";
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile,
} from "firebase/auth";
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
      <DialogTrigger asChild>{children}</DialogTrigger>
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
