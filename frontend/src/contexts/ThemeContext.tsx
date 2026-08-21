// src/contexts/ThemeContext.tsx

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";


/* =========================================================
   TYPES
   ========================================================= */

export type AppTheme =
  | "dark"
  | "light";


interface ThemeContextValue {
  theme:
    AppTheme;

  isDark:
    boolean;

  isLight:
    boolean;

  setTheme:
    (
      theme:
        AppTheme
    ) => void;

  toggleTheme:
    () => void;
}


/* =========================================================
   STORAGE
   ========================================================= */

const THEME_STORAGE_KEY =
  "accessmate_theme";


/* =========================================================
   CONTEXT
   ========================================================= */

const ThemeContext =
  createContext<
    ThemeContextValue | undefined
  >(
    undefined
  );


/* =========================================================
   HELPERS
   ========================================================= */

function getInitialTheme():
  AppTheme {
  if (
    typeof window ===
    "undefined"
  ) {
    return "dark";
  }


  try {
    const storedTheme =
      localStorage.getItem(
        THEME_STORAGE_KEY
      );


    if (
      storedTheme ===
        "light" ||
      storedTheme ===
        "dark"
    ) {
      return storedTheme;
    }
  } catch {
    // Ignore localStorage failures.
  }


  /*
   * AccessMate uses Dark Mode as the default
   * when the user has not selected a theme yet.
   */
  return "dark";
}


function applyThemeToDocument(
  theme:
    AppTheme
) {
  if (
    typeof document ===
    "undefined"
  ) {
    return;
  }


  const root =
    document.documentElement;


  root.setAttribute(
    "data-theme",
    theme
  );


  root.style.colorScheme =
    theme;


  if (
    document.body
  ) {
    document.body.setAttribute(
      "data-theme",
      theme
    );


    document.body.classList.toggle(
      "accessmate-dark-theme",
      theme ===
        "dark"
    );


    document.body.classList.toggle(
      "accessmate-light-theme",
      theme ===
        "light"
    );
  }
}


/* =========================================================
   PROVIDER
   ========================================================= */

export function ThemeProvider({
  children,
}: {
  children:
    ReactNode;
}) {
  const [
    theme,
    setThemeState,
  ] =
    useState<AppTheme>(
      getInitialTheme
    );


  /* =======================================================
     APPLY + PERSIST
     ======================================================= */

  useEffect(() => {
    applyThemeToDocument(
      theme
    );


    try {
      localStorage.setItem(
        THEME_STORAGE_KEY,
        theme
      );
    } catch {
      // Ignore localStorage failures.
    }


    /*
     * Other AccessMate components can listen to this
     * without depending directly on ThemeContext.
     */
    window.dispatchEvent(
      new CustomEvent(
        "accessmate-theme-changed",
        {
          detail: {
            theme,
          },
        }
      )
    );
  }, [
    theme,
  ]);


  /* =======================================================
     SYNC BETWEEN BROWSER TABS
     ======================================================= */

  useEffect(() => {
    function handleStorage(
      event:
        StorageEvent
    ) {
      if (
        event.key !==
        THEME_STORAGE_KEY
      ) {
        return;
      }


      if (
        event.newValue !==
          "dark" &&
        event.newValue !==
          "light"
      ) {
        return;
      }


      setThemeState(
        event.newValue
      );
    }


    window.addEventListener(
      "storage",
      handleStorage
    );


    return () => {
      window.removeEventListener(
        "storage",
        handleStorage
      );
    };
  }, []);


  /* =======================================================
     SET THEME
     ======================================================= */

  const setTheme =
    useCallback(
      (
        nextTheme:
          AppTheme
      ) => {
        setThemeState(
          nextTheme
        );
      },
      []
    );


  /* =======================================================
     TOGGLE
     ======================================================= */

  const toggleTheme =
    useCallback(
      () => {
        setThemeState(
          (
            currentTheme
          ) =>
            currentTheme ===
            "dark"
              ? "light"
              : "dark"
        );
      },
      []
    );


  /* =======================================================
     CONTEXT VALUE
     ======================================================= */

  const value =
    useMemo<
      ThemeContextValue
    >(
      () => ({
        theme,

        isDark:
          theme ===
          "dark",

        isLight:
          theme ===
          "light",

        setTheme,

        toggleTheme,
      }),
      [
        theme,
        setTheme,
        toggleTheme,
      ]
    );


  return (
    <ThemeContext.Provider
      value={
        value
      }
    >
      {children}
    </ThemeContext.Provider>
  );
}


/* =========================================================
   HOOK
   ========================================================= */

export function useTheme() {
  const context =
    useContext(
      ThemeContext
    );


  if (
    !context
  ) {
    throw new Error(
      "useTheme must be used inside ThemeProvider."
    );
  }


  return context;
}