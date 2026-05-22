export const siteConfig = {
  name: "Urologics",
  shortName: "Urologics",
  description:
    "Urologics is a premium FRCS Urology preparation platform with video courses, chapter-wise quizzes, weekly mocks, grand mocks, progress tracking, and an AI viva system.",
  keywords: [
    "Urologics",
    "FRCS urology course",
    "best urology course",
    "urology viva course",
    "AI viva urology",
    "FRCS urology preparation",
    "urology mock test",
    "urology video course",
  ],
  creator: "Urologics",
  authors: [{ name: "Urologics" }],
  defaultOgImage: "/logo.png",
};

export function getSiteUrl() {
  const envUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL ||
    process.env.VERCEL_URL;

  if (!envUrl) {
    return "http://localhost:3000";
  }

  return envUrl.startsWith("http") ? envUrl : `https://${envUrl}`;
}

export function absoluteUrl(path = "/") {
  const base = getSiteUrl().replace(/\/+$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalizedPath}`;
}
