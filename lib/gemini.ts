import "server-only";
import { GoogleGenAI, type GenerateContentConfig } from "@google/genai";

export function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is missing or blank. Configure it in the server runtime environment.");
  }
  return new GoogleGenAI({ apiKey });
}

export function getGeminiModelName() {
  return process.env.GEMINI_MODEL?.trim() || "gemini-3.6-flash";
}

export const GEMINI_JSON_CONFIG = {
  responseMimeType: "application/json",
  temperature: 0,
} satisfies GenerateContentConfig;
