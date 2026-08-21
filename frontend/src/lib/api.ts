// src/lib/api.ts

const RAW_API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

const API_PREFIX = "/api/v1";
const TOKEN_KEY = "accessmate_token";

/**
 * Normalize the base URL.
 *
 * It safely handles both:
 * http://127.0.0.1:8000
 *
 * and:
 * http://127.0.0.1:8000/api/v1
 *
 * so /api/v1 will never be duplicated.
 */
const API_BASE_URL = RAW_API_BASE_URL
  .replace(/\/+$/, "")
  .replace(/\/api\/v1$/i, "");

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function removeToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export function getApiError(err: unknown): string {
  if (err instanceof Error) return err.message;

  if (typeof err === "string") return err;

  return "An unknown error occurred";
}

export function unwrapResponse<T>(response: any): T {
  if (response?.data !== undefined) {
    return response.data as T;
  }

  return response as T;
}

type ApiOptions = Omit<RequestInit, "method" | "body">;

function normalizePath(path: string): string {
  let normalized = String(path || "").trim();

  // Remove complete /api/v1 prefix if a page accidentally sends it.
  normalized = normalized.replace(/^\/?api\/v1\/?/i, "");

  // Remove extra starting slashes.
  normalized = normalized.replace(/^\/+/, "");

  return normalized;
}

function buildUrl(path: string): string {
  // Allow an absolute URL if ever needed.
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const normalizedPath = normalizePath(path);

  return `${API_BASE_URL}${API_PREFIX}/${normalizedPath}`;
}

function prepareBody(body: unknown): BodyInit | undefined {
  if (body === undefined || body === null) {
    return undefined;
  }

  // FormData must NOT be JSON.stringify-ed.
  if (body instanceof FormData) {
    return body;
  }

  if (body instanceof URLSearchParams) {
    return body;
  }

  if (body instanceof Blob) {
    return body;
  }

  if (typeof body === "string") {
    return body;
  }

  if (body instanceof ArrayBuffer) {
    return body;
  }

  // Normal objects are sent as JSON.
  return JSON.stringify(body);
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const fullUrl = buildUrl(path);

  const headers = new Headers(options.headers || {});

  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const isFormData =
    typeof FormData !== "undefined" &&
    options.body instanceof FormData;

  if (isFormData) {
    /**
     * IMPORTANT:
     * Never manually set multipart/form-data here.
     *
     * The browser must generate:
     * multipart/form-data; boundary=....
     */
    headers.delete("Content-Type");
  } else if (
    options.body !== undefined &&
    options.body !== null &&
    !headers.has("Content-Type")
  ) {
    headers.set("Content-Type", "application/json");
  }

  console.log(
    `[API Request] ${options.method || "GET"} -> ${fullUrl}`
  );

  try {
    const res = await fetch(fullUrl, {
      ...options,
      headers,
    });

    if (!res.ok) {
      let errorMsg = `API Error ${res.status}`;

      try {
        const errorData = await res.json();

        if (errorData?.detail) {
          if (Array.isArray(errorData.detail)) {
            errorMsg = errorData.detail
              .map((err: any) => {
                if (typeof err === "string") return err;

                return (
                  err?.msg ||
                  err?.message ||
                  JSON.stringify(err)
                );
              })
              .join(", ");
          } else if (typeof errorData.detail === "string") {
            errorMsg = errorData.detail;
          } else {
            errorMsg = JSON.stringify(errorData.detail);
          }
        } else if (errorData?.message) {
          errorMsg = String(errorData.message);
        } else if (errorData?.error) {
          errorMsg = String(errorData.error);
        }
      } catch {
        try {
          const text = await res.text();

          if (text) {
            errorMsg = text;
          }
        } catch {
          // Keep default error message.
        }
      }

      throw new Error(errorMsg);
    }

    if (res.status === 204) {
      return null as T;
    }

    const contentType = res.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      return (await res.json()) as T;
    }

    const text = await res.text();

    return text as T;
  } catch (error) {
    console.error("[API Error Thrown]", error);
    throw error;
  }
}

export const api = {
  get: <T = any>(
    path: string,
    options: ApiOptions = {}
  ): Promise<T> =>
    request<T>(path, {
      ...options,
      method: "GET",
    }),

  post: <T = any>(
    path: string,
    body?: unknown,
    options: ApiOptions = {}
  ): Promise<T> =>
    request<T>(path, {
      ...options,
      method: "POST",
      body: prepareBody(body),
    }),

  patch: <T = any>(
    path: string,
    body?: unknown,
    options: ApiOptions = {}
  ): Promise<T> =>
    request<T>(path, {
      ...options,
      method: "PATCH",
      body: prepareBody(body),
    }),

  put: <T = any>(
    path: string,
    body?: unknown,
    options: ApiOptions = {}
  ): Promise<T> =>
    request<T>(path, {
      ...options,
      method: "PUT",
      body: prepareBody(body),
    }),

  delete: <T = any>(
    path: string,
    options: ApiOptions = {}
  ): Promise<T> =>
    request<T>(path, {
      ...options,
      method: "DELETE",
    }),
};