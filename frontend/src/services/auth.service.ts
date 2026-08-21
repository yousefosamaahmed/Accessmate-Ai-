// src/services/auth.service.ts
import { api, unwrapResponse } from "../lib/api";

export interface RegisterData {
  full_name: string;
  username?: string;
  email: string;
  country?: string;
  phone_number: string;
  password: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface OTPVerifyData {
  email_verification_token: string;
  code: string;
}

export interface PasswordResetRequestData {
  email: string;
}

export interface PasswordResetConfirmData {
  email: string;
  code: string;
  new_password: string;
  password_reset_token: string;
}

export const authService = {
  register: async (data: RegisterData) => {
    const response = await api.post("/auth/register", data);
    return unwrapResponse(response);
  },

  login: async (data: LoginData) => {
    const response = await api.post("/auth/login", data);
    return unwrapResponse(response);
  },

  verifyOTP: async (data: OTPVerifyData) => {
    const response = await api.post("/auth/email-otp/verify-login", data);
    return unwrapResponse(response);
  },

  requestPasswordReset: async (data: PasswordResetRequestData) => {
    const response = await api.post("/auth/password-reset/request", data);
    return unwrapResponse(response);
  },

  confirmPasswordReset: async (data: PasswordResetConfirmData) => {
    const response = await api.post("/auth/password-reset/confirm", data);
    return unwrapResponse(response);
  },

  logout: async () => {
    const response = await api.post("/auth/logout");
    return unwrapResponse(response);
  },

  getMe: async () => {
    const response = await api.get("/auth/me");
    return unwrapResponse(response);
  },
};