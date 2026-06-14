import { NextResponse } from "next/server";

type RestCountry = {
  name?: {
    common?: string;
  };
  idd?: {
    root?: string;
    suffixes?: string[];
  };
  cca2?: string;
};

export async function GET() {
  try {
    const response = await fetch("https://restcountries.com/v3.1/all?fields=name,idd,cca2", {
      headers: {
        "User-Agent": "Urologics/1.0",
      },
      next: { revalidate: 60 * 60 * 24 },
    });

    if (!response.ok) {
      throw new Error("Country API unavailable");
    }

    const data = (await response.json()) as RestCountry[];
    const countries = data
      .map((country) => {
        const name = country.name?.common?.trim();
        const root = country.idd?.root?.trim();
        const suffix = country.idd?.suffixes?.[0]?.trim() ?? "";

        if (!name || !root) return null;

        const dialCode = `${root}${suffix}`;
        return {
          label: `${name} (${dialCode})`,
          value: `${name}-${dialCode}`,
          code: country.cca2 || "",
        };
      })
      .filter((country): country is { label: string; value: string; code: string } => Boolean(country))
      .sort((left, right) => left.label.localeCompare(right.label));

    return NextResponse.json({ countries });
  } catch (error) {
    console.error("Dial code country fetch error:", error);

    try {
      const fallbackResponse = await fetch("https://countriesnow.space/api/v0.1/countries/codes", {
        headers: {
          "User-Agent": "Urologics/1.0",
        },
        next: { revalidate: 60 * 60 * 24 },
      });

      if (!fallbackResponse.ok) {
        throw new Error("Fallback country API unavailable");
      }

      const fallbackPayload = (await fallbackResponse.json()) as {
        data?: Array<{ name?: string; dial_code?: string; code?: string }>;
      };

      const countries = (fallbackPayload.data || [])
        .map((country) => {
          const name = String(country.name || "").trim();
          const dialCode = String(country.dial_code || "").trim();

          if (!name || !dialCode) return null;

          return {
            label: `${name} (${dialCode})`,
            value: `${name}-${dialCode}`,
            code: country.code || "",
          };
        })
        .filter((country): country is { label: string; value: string; code: string } => Boolean(country))
        .sort((left, right) => left.label.localeCompare(right.label));

      return NextResponse.json({ countries });
    } catch (fallbackError) {
      console.error("Fallback dial code country fetch error:", fallbackError);
      return NextResponse.json({ error: "Failed to load countries" }, { status: 500 });
    }
  }
}
