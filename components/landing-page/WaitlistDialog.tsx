"use client";

import { useEffect, useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type CountryOption = {
  label: string;
  value: string;
};

type RestCountry = {
  name?: {
    common?: string;
  };
  idd?: {
    root?: string;
    suffixes?: string[];
  };
};

const fallbackCountries: CountryOption[] = [
  { label: "India (+91)", value: "India-+91" },
  { label: "United Kingdom (+44)", value: "United Kingdom-+44" },
  { label: "United States (+1)", value: "United States-+1" },
  { label: "United Arab Emirates (+971)", value: "United Arab Emirates-+971" },
  { label: "Singapore (+65)", value: "Singapore-+65" },
];

export function WaitlistDialog() {
  const [countries, setCountries] = useState<CountryOption[]>(fallbackCountries);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadCountries() {
      try {
        const response = await fetch(
          "https://restcountries.com/v3.1/all?fields=name,idd"
        );
        const data = await response.json();

        if (!Array.isArray(data)) return;

        const nextCountries = (data as RestCountry[])
          .map((country) => {
            const root = country?.idd?.root;
            const suffix = country?.idd?.suffixes?.[0] ?? "";
            const name = country?.name?.common;

            if (!root || !name) return null;

            const dialCode = `${root}${suffix}`;
            return {
              label: `${name} (${dialCode})`,
              value: `${name}-${dialCode}`,
            };
          })
          .filter(Boolean)
          .sort((a, b) => a.label.localeCompare(b.label)) as CountryOption[];

        if (!cancelled && nextCountries.length > 0) {
          setCountries(nextCountries);
        }
      } catch {
        if (!cancelled) {
          setCountries(fallbackCountries);
        }
      }
    }

    loadCountries();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="rounded-full bg-gradient-to-r from-[#0f7896] to-[#1294ba] px-8 py-7 text-base font-bold text-white shadow-[0_8px_30px_rgba(15,120,150,0.25)] transition-all duration-300 hover:-translate-y-1 hover:scale-105 hover:from-[#1294ba] hover:to-[#0f7896] hover:shadow-[0_12px_40px_rgba(15,120,150,0.4)]">
          Join Waitlist
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[92vh] overflow-y-auto rounded-[32px] border border-[#0f7896]/14 bg-white p-6 shadow-[0_24px_70px_rgba(15,120,150,0.18)] sm:max-w-2xl">
        <DialogHeader className="text-center">
          <DialogTitle className="text-3xl font-extrabold tracking-[-0.04em] text-[#071014]">
            Join the Urologics Waitlist
          </DialogTitle>
          <DialogDescription className="text-[#071014]/58">
            Tell us a little about you. We will send a beautiful launch mail
            when everything is ready.
          </DialogDescription>
        </DialogHeader>

        <form className="mt-3 grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-[#071014]/68">
                Name
              </label>
              <Input
                placeholder="Dr. John Doe"
                className="h-12 rounded-2xl border-[#0f7896]/14 bg-cyan-50/60"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-[#071014]/68">
                Email
              </label>
              <Input
                type="email"
                placeholder="you@example.com"
                className="h-12 rounded-2xl border-[#0f7896]/14 bg-cyan-50/60"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-[0.8fr_1.2fr]">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-[#071014]/68">
                Country
              </label>
              <Select defaultValue="India-+91">
                <SelectTrigger className="h-12 w-full rounded-2xl border-[#0f7896]/14 bg-cyan-50/60">
                  <SelectValue placeholder="Country" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {countries.map((country) => (
                    <SelectItem
                      key={`${country.label}-${country.value}`}
                      value={country.value}
                    >
                      {country.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-[#071014]/68">
                Number
              </label>
              <Input
                type="tel"
                placeholder="98765 43210"
                className="h-12 rounded-2xl border-[#0f7896]/14 bg-cyan-50/60"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-[#071014]/68">
              Title
            </label>
            <Input
              placeholder="Urologist, resident, doctor, educator..."
              className="h-12 rounded-2xl border-[#0f7896]/14 bg-cyan-50/60"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-[#071014]/68">
              Let us know you were here
            </label>
            <Textarea
              placeholder="Where are you in your FRCS journey? What should we know?"
              className="min-h-28 rounded-2xl border-[#0f7896]/14 bg-cyan-50/60"
            />
          </div>

          <Button
            type="button"
            onClick={() => setOpen(false)}
            className="mt-2 rounded-2xl bg-gradient-to-r from-[#0f7896] to-[#1294ba] py-6 text-base font-extrabold text-white hover:from-[#1294ba] hover:to-[#0f7896]"
          >
            Join Waitlist
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
