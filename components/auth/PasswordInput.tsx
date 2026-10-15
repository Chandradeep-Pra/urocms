"use client";
import { useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

export default function PasswordInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  const [visible, setVisible] = useState(false);
  return <div className="relative">
    <input {...props} type={visible ? "text" : "password"} className={cn("h-11 w-full rounded-xl border border-slate-200 bg-white px-3 pr-11 text-sm outline-none focus:border-[#c5a54d] focus:ring-2 focus:ring-[#c5a54d]/20 aria-[invalid=true]:border-red-400", className)} />
    <button type="button" aria-label={visible ? "Hide password" : "Show password"} aria-pressed={visible} disabled={props.disabled} onClick={() => setVisible(!visible)} className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-xl text-slate-500 hover:text-[#0b2948] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c5a54d]">
      {visible ? <EyeOff size={18} /> : <Eye size={18} />}
    </button>
  </div>;
}
