import { API_BASE_URL, API_REQUEST_TIMEOUT_MS } from "../config/env";

function isRetriableNetworkError(error) {
  if (!error) {
    return false;
  }

  return error.name === "AbortError" || error instanceof TypeError;
}

export class ApiError extends Error {
  constructor(message, status, code, details) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function toApiErrorFromNetwork(error, timeoutMs = API_REQUEST_TIMEOUT_MS) {
  if (error?.name === "AbortError") {
    const timeoutInSeconds = Math.ceil(timeoutMs / 1000);
    return new ApiError(
      `Request timed out after ${timeoutInSeconds} seconds while waiting for server response`,
      504,
      "REQUEST_TIMEOUT",
      { timeoutMs },
    );
  }

  if (error instanceof TypeError) {
    return new ApiError("Could not reach backend service", 503, "NETWORK_ERROR");
  }

  return error instanceof ApiError
    ? error
    : new ApiError("Unexpected client networking error", 500, "CLIENT_NETWORK_ERROR", {
        cause: error?.message || String(error),
      });
}

async function parseJsonSafe(response) {
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    return null;
  }

  try {
    return await response.json();
  } catch {
    return null;
  }
}

export async function request(path, options = {}) {
  const { timeoutMs = API_REQUEST_TIMEOUT_MS, ...fetchOptions } = options;
  const method = (fetchOptions.method || "GET").toUpperCase();
  const maxRetries = method === "GET" ? 1 : 0;
  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${API_BASE_URL}${path}`, {
        ...fetchOptions,
        signal: controller.signal,
      });

      clearTimeout(timeoutHandle);

      const payload = await parseJsonSafe(response);

      if (!response.ok) {
        const errorMessage = payload?.error?.message || `Request failed with status ${response.status}`;
        throw new ApiError(
          errorMessage,
          response.status,
          payload?.error?.code || "REQUEST_ERROR",
          payload?.error?.details,
        );
      }

      return payload;
    } catch (error) {
      clearTimeout(timeoutHandle);
      lastError = error;

      if (attempt < maxRetries && isRetriableNetworkError(error)) {
        await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
        continue;
      }

      throw toApiErrorFromNetwork(error, timeoutMs);
    }
  }

  throw toApiErrorFromNetwork(lastError, timeoutMs);
}
