"use client"

import { useState } from "react"
import { signOut } from "firebase/auth"
import { Loader2, Power } from "lucide-react"
import { toast } from "sonner"
import { auth } from "@/lib/firebaseClient"
import { clearTestingZoneAuth } from "@/lib/testingZoneAuthHandoff"

export function LogoutButton({ disabled = false }: { disabled?: boolean }) {
  const [loggingOut, setLoggingOut] = useState(false)

  async function logout() {
    if (loggingOut || disabled) return
    setLoggingOut(true)
    try {
      await clearTestingZoneAuth()
      await signOut(auth)
    } catch {
      toast.error("Unable to log out. Please try again.")
    } finally {
      setLoggingOut(false)
    }
  }

  return (
    <div className="group relative shrink-0">
      <button
        type="button"
        aria-label={loggingOut ? "Logging out" : "Logout"}
        disabled={disabled || loggingOut}
        onClick={logout}
        className="flex h-11 w-11 items-center justify-center rounded-full border border-[#0f7896]/20 bg-white text-[#0f7896] transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f7896] focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-50"
      >
        {loggingOut ? <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin" /> : <Power aria-hidden="true" className="h-5 w-5" />}
      </button>
      <span className="pointer-events-none absolute right-0 top-full z-[80] mt-2 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
        Logout
      </span>
    </div>
  )
}
