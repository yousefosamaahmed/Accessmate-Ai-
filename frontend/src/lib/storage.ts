  export const TOKEN_KEY = "accessmate_token";
  export const USER_KEY = "accessmate_user";

  export function saveToken(token: string) {
    localStorage.setItem(TOKEN_KEY, token);
  }

  export function getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }

  export function removeToken() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  export function saveUser(user: unknown) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  export function getUser<T = unknown>(): T | null {
    const raw = localStorage.getItem(USER_KEY);

    if (!raw) return null;

    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }
