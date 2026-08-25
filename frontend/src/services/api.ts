// src/services/api.ts
import axios from "axios";
import { getToken, removeToken } from "../lib/storage";

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api/v1";

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      removeToken();
    }
    return Promise.reject(error);
  }
);

export function unwrapResponse<T = any>(response: any): T {
  const body = response?.data;
  if (body?.data !== undefined) {
    return body.data as T;
  }
  return body as T;
}

export function getApiError(error: any): string {
  const detail = error?.response?.data?.detail;
  const message = error?.response?.data?.message;

  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        const field = Array.isArray(item.loc) ? item.loc.join(".") : "field";
        return `${field}: ${item.msg}`;
      })
      .join(" | ");
  }

  if (typeof detail === "string") return detail;
  if (typeof message === "string") return message;

  if (error?.code === "ERR_NETWORK") {
    return "Cannot connect to AccessMate backend. Make sure FastAPI is running on port 8000.";
  }

  return "Something went wrong. Please try again.";
}