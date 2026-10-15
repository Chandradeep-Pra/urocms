export type SignupValues = {
  name: string; email: string; password: string; confirmPassword: string;
  countryValue: string; phone: string; medicalInstitution: string;
};
export type SignupErrors = Partial<Record<keyof SignupValues, string>>;
export const emptySignup: SignupValues = { name: "", email: "", password: "", confirmPassword: "", countryValue: "", phone: "", medicalInstitution: "" };

export function validateSignup(values: SignupValues): SignupErrors {
  const errors: SignupErrors = {};
  if (!values.name.trim()) errors.name = "Enter your full name.";
  if (!values.email.trim()) errors.email = "Enter your email address.";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) errors.email = "Enter a valid email address.";
  if (!values.password) errors.password = "Enter a password.";
  else if (values.password.length < 6) errors.password = "Use at least 6 characters.";
  if (!values.confirmPassword) errors.confirmPassword = "Confirm your password.";
  else if (values.password !== values.confirmPassword) errors.confirmPassword = "Passwords do not match.";
  if (!values.countryValue) errors.countryValue = "Select your country.";
  if (!values.phone.trim()) errors.phone = "Enter your phone number.";
  else if (values.phone.replace(/\D/g, "").length !== 10) errors.phone = "Enter your 10-digit phone number.";
  if (!values.medicalInstitution.trim()) errors.medicalInstitution = "Enter your medical institution.";
  return errors;
}
