export type CountryOption = {
  label: string
  value: string
}

export const defaultCountryValue = "United Kingdom-+44"

export const fallbackCountries: CountryOption[] = [
  { label: "India (+91)", value: "India-+91" },
  { label: "United Kingdom (+44)", value: defaultCountryValue },
  { label: "United States (+1)", value: "United States-+1" },
  { label: "United Arab Emirates (+971)", value: "United Arab Emirates-+971" },
  { label: "Singapore (+65)", value: "Singapore-+65" },
]

export function splitCountryValue(value: string) {
  const [country, dialCode] = value.split(/-(?=\+)/)

  return {
    country: country || "United Kingdom",
    dialCode: dialCode || "+44",
  }
}

export async function loadCountryOptions() {
  try {
    const response = await fetch("/api/countries/dial-codes", {
      cache: "no-store",
    })

    if (!response.ok) return fallbackCountries

    const payload = (await response.json()) as { countries?: CountryOption[] }
    return Array.isArray(payload.countries) && payload.countries.length
      ? payload.countries
      : fallbackCountries
  } catch {
    return fallbackCountries
  }
}
