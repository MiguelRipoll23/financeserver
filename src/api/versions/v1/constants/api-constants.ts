// Image upload constants
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB
export const ALLOWED_IMAGE_MIME_TYPES: string[] = [
  "image/png",
  "image/jpeg",
  "image/webp",
];

// Session cache constants
export const MAX_SESSION_CACHE_ENTRIES = 1000;
export const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
