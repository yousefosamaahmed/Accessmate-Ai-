// src/contexts/AuthContext.tsx

import React, {
  createContext,
  useEffect,
  useState,
} from "react";

import type { ReactNode } from "react";

import {
  getToken,
  saveToken,
  removeToken,
  getUser,
  saveUser,
} from "../lib/storage";

import {
  api,
  getApiError,
  unwrapResponse,
} from "../lib/api";

interface AuthContextType {
  user: any | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (
    token: string,
    user?: any
  ) => void;
  logout: () => Promise<void>;
  updateUser: (
    user: any
  ) => void;
}

export const AuthContext =
  createContext<
    AuthContextType | undefined
  >(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

function isUnauthorizedError(
  error: unknown
): boolean {
  const message =
    getApiError(error)
      .toLowerCase();

  return (
    message.includes("401") ||
    message.includes(
      "unauthorized"
    ) ||
    message.includes(
      "not authenticated"
    ) ||
    message.includes(
      "invalid token"
    ) ||
    message.includes(
      "could not validate credentials"
    )
  );
}

export const AuthProvider:
  React.FC<AuthProviderProps> = ({
    children,
  }) => {
    const [user, setUser] =
      useState<any | null>(
        getUser()
      );

    const [token, setToken] =
      useState<string | null>(
        getToken()
      );

    const [
      isLoading,
      setIsLoading,
    ] = useState(true);

    useEffect(() => {
      let cancelled = false;

      const loadUser =
        async () => {
          /*
           * مفيش token:
           * المستخدم فعلاً مش عامل Login.
           */
          if (!token) {
            if (!cancelled) {
              setIsLoading(
                false
              );
            }

            return;
          }

          /*
           * فيه token:
           * نحاول نتأكد من المستخدم،
           * لكن ما نمسحش الـ session
           * بسبب Network / DB / 500 errors.
           */
          setIsLoading(true);

          try {
            const response =
              await api.get<any>(
                "/auth/me"
              );

            if (cancelled) {
              return;
            }

            const userData =
              unwrapResponse<any>(
                response
              );

            setUser(userData);

            if (userData) {
              saveUser(userData);
            }
          } catch (error) {
            console.error(
              "[AuthContext] Failed to load /auth/me:",
              error
            );

            if (cancelled) {
              return;
            }

            /*
             * مهم جداً:
             * Logout فقط لو التوكن
             * مرفوض فعلاً من الباك.
             */
            if (
              isUnauthorizedError(
                error
              )
            ) {
              console.warn(
                "[AuthContext] Token is unauthorized. Clearing session."
              );

              removeToken();

              setToken(null);
              setUser(null);
            } else {
              /*
               * لو حصل:
               *
               * Failed to fetch
               * 500
               * Database down
               * CORS مؤقت
               * Network error
               *
               * نحافظ على التوكن
               * ولا نرمي المستخدم بره حسابه.
               */
              const cachedUser =
                getUser();

              if (
                cachedUser &&
                !user
              ) {
                setUser(
                  cachedUser
                );
              }

              console.warn(
                "[AuthContext] Keeping current session because this was not a 401 Unauthorized error."
              );
            }
          } finally {
            if (!cancelled) {
              setIsLoading(
                false
              );
            }
          }
        };

      loadUser();

      return () => {
        cancelled = true;
      };
    }, [token]);

    const login = (
      newToken: string,
      userData?: any
    ) => {
      if (!newToken) {
        console.error(
          "[AuthContext] login() called without token."
        );

        return;
      }

      /*
       * 1. حفظ التوكن بشكل دائم.
       */
      saveToken(newToken);

      /*
       * 2. تحديث React state.
       *
       * ده يخلي ProtectedRoute
       * يعرف فوراً إن المستخدم
       * Logged in.
       */
      setToken(newToken);

      /*
       * 3. حفظ المستخدم لو
       * رجع مع Login / OTP.
       */
      if (userData) {
        setUser(userData);
        saveUser(userData);
      }

      console.log(
        "[AuthContext] Login session stored successfully."
      );
    };

    const logout =
      async () => {
        /*
         * مش هنعتمد على وجود
         * logout endpoint في الباك.
         *
         * الجلسة الأساسية JWT،
         * فنمسح البيانات المحلية.
         */

        removeToken();

        setToken(null);
        setUser(null);

        console.log(
          "[AuthContext] Logged out."
        );
      };

    const updateUser = (
      newUser: any
    ) => {
      setUser(newUser);

      if (newUser) {
        saveUser(newUser);
      }
    };

    return (
      <AuthContext.Provider
        value={{
          user,

          token,

          isAuthenticated:
            Boolean(token),

          isLoading,

          login,

          logout,

          updateUser,
        }}
      >
        {children}
      </AuthContext.Provider>
    );
  };