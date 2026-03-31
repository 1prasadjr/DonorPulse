const rawBaseUrl = import.meta.env.VITE_API_BASE_URL;
const rawRequestTimeoutMs = import.meta.env.VITE_API_REQUEST_TIMEOUT_MS;
const rawUploadTimeoutMs = import.meta.env.VITE_API_UPLOAD_TIMEOUT_MS;

function parsePositiveInt(value, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.floor(parsed);
}

export const API_BASE_URL = rawBaseUrl
  ? rawBaseUrl.replace(/\/$/, "")
  : "http://localhost:8080/api/v1";

export const API_REQUEST_TIMEOUT_MS = parsePositiveInt(rawRequestTimeoutMs, 45_000);
export const API_UPLOAD_TIMEOUT_MS = parsePositiveInt(rawUploadTimeoutMs, Math.max(API_REQUEST_TIMEOUT_MS, 150_000));
