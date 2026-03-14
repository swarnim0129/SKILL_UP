const { GoogleGenerativeAI } = require("@google/generative-ai");

/**
 * Round-robin Gemini API key manager.
 *
 * Reads keys from environment variables:
 *   GEMINI_API_KEY_1, GEMINI_API_KEY_2, ..., GEMINI_API_KEY_N
 * Falls back to GEMINI_API_KEY if no numbered keys are found.
 */

const keys = [];

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
 * Returns the next API key in round-robin order.
 */
function getNextKey() {
  if (keys.length === 0) return null;
  const key = keys[currentIndex % keys.length];
  currentIndex++;
  return key;
}

/**
 * Returns a GoogleGenerativeAI instance initialised with the next key.
 */
function getGenAI() {
  const key = getNextKey();
  if (!key) return null;
  return new GoogleGenerativeAI(key);
}

/**
 * Returns true if at least one key is available.
 */
function hasKeys() {
  return keys.length > 0;
}

module.exports = { getNextKey, getGenAI, hasKeys };
