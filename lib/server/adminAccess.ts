export function getAllowedAdminEmails() {
  return (process.env.ADMIN_ALLOWED_EMAILS || process.env.NEXT_PUBLIC_ADMIN_ALLOWED_EMAILS || "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

export function isAllowedAdminEmail(email?: string | null) {
  if (!email) return false;
  const normalizedEmail = email.trim().toLowerCase();
  const allowedEmails = getAllowedAdminEmails();

  return allowedEmails.includes(normalizedEmail);
}
