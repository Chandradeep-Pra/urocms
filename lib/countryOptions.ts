export type CountryOption = {
  label: string
  value: string
}

type RestCountry = {
  name?: {
    common?: string
  }
  idd?: {
    root?: string
    suffixes?: string[]
  }
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
  const response = await fetch("https://restcountries.com/v3.1/all?fields=name,idd")
  const data = await response.json()

  if (!Array.isArray(data)) return fallbackCountries

  const countries = (data as RestCountry[])
    .map((country) => {
      const root = country?.idd?.root
      const suffix = country?.idd?.suffixes?.[0] ?? ""
      const name = country?.name?.common

      if (!root || !name) return null

      const dialCode = `${root}${suffix}`
      return {
        label: `${name} (${dialCode})`,
        value: `${name}-${dialCode}`,
      }
    })
    .filter((country): country is CountryOption => Boolean(country))
    .sort((left, right) => left.label.localeCompare(right.label))

  return countries.length ? countries : fallbackCountries
}
