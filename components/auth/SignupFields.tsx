"use client";
import { useEffect, useState } from "react";
import { fallbackCountries, loadCountryOptions, splitCountryValue } from "@/lib/countryOptions";
import type { SignupErrors, SignupValues } from "@/lib/signupValidation";
import PasswordInput from "./PasswordInput";

export default function SignupFields({ values, onChange, errors, disabled, prefix = "signup" }: {
  values: SignupValues; onChange: (values: SignupValues) => void; errors: SignupErrors; disabled?: boolean; prefix?: string;
}) {
  const [countries, setCountries] = useState(fallbackCountries);
  useEffect(() => { let active = true; void loadCountryOptions().then(items => { if (active) setCountries(items); }); return () => { active = false; }; }, []);
  const inputClass = "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-[#c5a54d] focus:ring-2 focus:ring-[#c5a54d]/20 aria-[invalid=true]:border-red-400";
  function field(key: keyof SignupValues, label: string, type = "text", placeholder = "", wide = false) {
    const id = `${prefix}-${key}`;
    const common = { id, value: values[key], disabled, "aria-required": true as const, "aria-invalid": Boolean(errors[key]), "aria-describedby": errors[key] ? `${id}-error` : undefined, onChange: (event: React.ChangeEvent<HTMLInputElement>) => onChange({ ...values, [key]: key === "phone" ? event.target.value.replace(/\D/g, "").slice(0, 10) : event.target.value }) };
    return <div className={wide ? "min-[380px]:col-span-2" : ""} key={key}>
      <label htmlFor={id} className="mb-1.5 block text-xs font-semibold text-slate-700">{label} <span className="text-red-600" aria-hidden="true">*</span></label>
      {type === "password" ? <PasswordInput {...common} autoComplete="new-password" /> : <input {...common} type={type} placeholder={placeholder} autoComplete={key === "name" ? "name" : key === "email" ? "email" : key === "phone" ? "tel-national" : "organization"} className={inputClass} />}
      {errors[key] && <p id={`${id}-error`} className="mt-1 text-xs text-red-600">{errors[key]}</p>}
    </div>;
  }
  return <div className="grid gap-3 min-[380px]:grid-cols-2">
    {field("name", "Full name", "text", "Dr. John Doe")}
    {field("email", "Email", "email", "doctor@example.com")}
    {field("password", "Password", "password")}
    {field("confirmPassword", "Confirm password", "password")}
    <div><label htmlFor={`${prefix}-countryValue`} className="mb-1.5 block text-xs font-semibold text-slate-700">Country <span aria-hidden="true" className="text-red-600">*</span></label>
      <select id={`${prefix}-countryValue`} value={values.countryValue} disabled={disabled} aria-required="true" aria-invalid={Boolean(errors.countryValue)} aria-describedby={errors.countryValue ? `${prefix}-country-error` : undefined} onChange={event => onChange({ ...values, countryValue: event.target.value })} className={inputClass}>
        <option value="">Select country</option>{countries.map(country => <option key={country.value} value={country.value}>{country.label}</option>)}
      </select>{errors.countryValue && <p id={`${prefix}-country-error`} className="mt-1 text-xs text-red-600">{errors.countryValue}</p>}
    </div>
    {field("phone", `Phone number${values.countryValue ? ` (${splitCountryValue(values.countryValue).dialCode})` : ""}`, "tel", "Phone number")}
    {field("medicalInstitution", "Medical institution", "text", "Hospital, NHS Trust or medical college", true)}
    <p className="text-[11px] text-slate-500 min-[380px]:col-span-2"><span className="text-red-600">*</span> Required fields</p>
  </div>;
}
