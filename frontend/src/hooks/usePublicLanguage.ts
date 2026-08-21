import { useEffect, useState } from "react";

export type PublicLang = "en" | "ar";

const LANGUAGE_KEY = "accessmate_language";
const LANGUAGE_EVENT = "accessmate-public-language-change";

function readLanguage(): PublicLang {
  return localStorage.getItem(LANGUAGE_KEY) === "ar" ? "ar" : "en";
}

export function usePublicLanguage() {
  const [lang, setLangState] = useState<PublicLang>(() => readLanguage());

  useEffect(() => {
    const syncLanguage = () => {
      setLangState(readLanguage());
    };

    window.addEventListener("storage", syncLanguage);
    window.addEventListener(LANGUAGE_EVENT, syncLanguage);

    return () => {
      window.removeEventListener("storage", syncLanguage);
      window.removeEventListener(LANGUAGE_EVENT, syncLanguage);
    };
  }, []);

  const setLang = (next: PublicLang) => {
    localStorage.setItem(LANGUAGE_KEY, next);
    setLangState(next);
    window.dispatchEvent(new Event(LANGUAGE_EVENT));
  };

  const toggleLanguage = () => {
    setLang(lang === "en" ? "ar" : "en");
  };

  return {
    lang,
    isArabic: lang === "ar",
    setLang,
    toggleLanguage,
  };
}
