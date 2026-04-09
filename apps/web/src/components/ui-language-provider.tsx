"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type UiLanguage = "ko" | "en";

type UiLanguageContextValue = {
  language: UiLanguage;
  setLanguage: (nextLanguage: UiLanguage) => void;
  toggleLanguage: () => void;
};

const UI_LANGUAGE_STORAGE_KEY = "im-ui-language";

const UiLanguageContext = createContext<UiLanguageContextValue | null>(null);

export function UiLanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<UiLanguage>("ko");

  useEffect(() => {
    const savedLanguage = window.localStorage.getItem(UI_LANGUAGE_STORAGE_KEY);
    if (savedLanguage === "ko" || savedLanguage === "en") {
      setLanguageState(savedLanguage);
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
    window.localStorage.setItem(UI_LANGUAGE_STORAGE_KEY, language);
  }, [language]);

  const value = useMemo<UiLanguageContextValue>(
    () => ({
      language,
      setLanguage: (nextLanguage) => setLanguageState(nextLanguage),
      toggleLanguage: () => setLanguageState((currentLanguage) => (currentLanguage === "ko" ? "en" : "ko")),
    }),
    [language],
  );

  return <UiLanguageContext.Provider value={value}>{children}</UiLanguageContext.Provider>;
}

export function useUiLanguage() {
  const context = useContext(UiLanguageContext);

  if (!context) {
    throw new Error("useUiLanguage must be used within UiLanguageProvider");
  }

  return context;
}
