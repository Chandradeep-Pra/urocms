"use client"

import type { User } from "firebase/auth"

const TESTING_ZONE_AUTH_STORAGE_KEY = "urologics-testing-zone-auth"
const LOGOUT_FLAG_KEY = "urologics-auth-logged-out"
export const SIGNUP_AUTO_ROUTE_SUPPRESS_KEY = "urologics-signup-auto-route-suppressed"

type AppAccessResponse = {
  tier?: "guest" | "free" | "paid"
  profile?: {
    uid?: string
    email?: string | null
    name?: string | null
    profileImageUrl?: string | null
    activeCourseIds?: string[]
    phone?: string | null
    country?: string | null
    medicalInstitution?: string | null
  }
}

type AuthHandoffOverrides = {
  tier?: "guest" | "free" | "paid"
  name?: string | null
  phone?: string | null
  country?: string | null
  medicalInstitution?: string | null
}

async function fetchAppAccess(idToken: string): Promise<AppAccessResponse | null> {
  try {
    const response = await fetch("/api/app/access", {
      headers: {
        Authorization: `Bearer ${idToken}`,
      },
      cache: "no-store",
    })

    if (!response.ok) return null

    return (await response.json()) as AppAccessResponse
  } catch {
    return null
  }
}

export async function syncTestingZoneAuth(
  user: User,
  idToken?: string,
  overrides: AuthHandoffOverrides = {}
) {
  const token = idToken || (await user.getIdToken())
  const access = await fetchAppAccess(token)
  const profile = access?.profile
  const email = (profile?.email || user.email || "").trim().toLowerCase()

  if (!email || typeof window === "undefined") return

  const fallbackName = email.split("@")[0]?.replace(/[._-]+/g, " ").trim() || "Learner"

  window.localStorage.setItem(
    TESTING_ZONE_AUTH_STORAGE_KEY,
    JSON.stringify({
      uid: profile?.uid || user.uid,
      email,
      name: (profile?.name || overrides.name || user.displayName || fallbackName).trim(),
      tier:
        access?.tier === "paid" || access?.tier === "free" || access?.tier === "guest"
          ? access.tier
          : overrides.tier || "guest",
      idToken: token,
      refreshToken: user.refreshToken,
      expiresAt: Date.now() + 55 * 60 * 1000,
      profileImageUrl: profile?.profileImageUrl || user.photoURL || null,
      activeCourseIds: Array.isArray(profile?.activeCourseIds) ? profile.activeCourseIds : [],
      phone: profile?.phone || overrides.phone || null,
      country: profile?.country || overrides.country || null,
      medicalInstitution: profile?.medicalInstitution || overrides.medicalInstitution || null,
    })
  )
}

export function clearTestingZoneAuth() {
  if (typeof window === "undefined") return

  window.localStorage.removeItem(TESTING_ZONE_AUTH_STORAGE_KEY)
  window.localStorage.setItem(LOGOUT_FLAG_KEY, "1")
}

export function consumeRecentLogoutFlag() {
  if (typeof window === "undefined") return false

  const wasLoggedOut = window.localStorage.getItem(LOGOUT_FLAG_KEY) === "1"
  if (wasLoggedOut) {
    window.localStorage.removeItem(LOGOUT_FLAG_KEY)
  }

  return wasLoggedOut
}

export function setSignupAutoRouteSuppressed(suppressed: boolean) {
  if (typeof window === "undefined") return

  if (suppressed) {
    window.localStorage.setItem(SIGNUP_AUTO_ROUTE_SUPPRESS_KEY, "1")
  } else {
    window.localStorage.removeItem(SIGNUP_AUTO_ROUTE_SUPPRESS_KEY)
  }
}

export function isSignupAutoRouteSuppressed() {
  if (typeof window === "undefined") return false

  return window.localStorage.getItem(SIGNUP_AUTO_ROUTE_SUPPRESS_KEY) === "1"
}
