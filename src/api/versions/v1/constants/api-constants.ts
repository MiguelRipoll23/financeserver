// Image upload constants
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB
export const ALLOWED_IMAGE_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
] as const;

// Google Gemini API constants
export const GOOGLE_GEMINI_API_BASE_URL =
  "https://generativelanguage.googleapis.com/v1beta";

// Session cache constants
export const MAX_SESSION_CACHE_ENTRIES = 1000;
export const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
