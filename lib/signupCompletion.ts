"use client"

type SignupCompletionInput = {
  idToken: string
  name: string
  phone: string
  country: string
  medicalInstitution: string
}

export async function completeSignupProfile(input: SignupCompletionInput) {
  const response = await fetch("/api/upgrade-user", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.idToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: input.name,
      phone: input.phone,
      country: input.country,
      medicalInstitution: input.medicalInstitution,
    }),
  })

  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(payload?.error || "Failed to complete signup profile")
  }

  return payload
}
