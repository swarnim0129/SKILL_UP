import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Round-robin Gemini API key manager for Next.js server-side routes.
 *
 * Reads keys from environment variables:
 *   GEMINI_API_KEY_1, GEMINI_API_KEY_2, ..., GEMINI_API_KEY_N
 * Falls back to GEMINI_API_KEY if no numbered keys are found.
 */

const keys: string[] = [];

// Collect numbered keys
for (let i = 1; i <= 20; i++) {
  const key = process.env[`GEMINI_API_KEY_${i}`];
  if (key) keys.push(key);
}

// Fallback to single key
if (keys.length === 0 && process.env.GEMINI_API_KEY) {
  keys.push(process.env.GEMINI_API_KEY);
}

let currentIndex = 0;

/**
 * Returns a GoogleGenerativeAI instance initialised with the next key
 * in round-robin order. Call this per-request, not at module top-level.
 */
export function getGeminiClient(): GoogleGenerativeAI {
  if (keys.length === 0) {
    throw new Error("No Gemini API keys configured");
  }
  const key = keys[currentIndex % keys.length];
  currentIndex++;
  return new GoogleGenerativeAI(key);
}
