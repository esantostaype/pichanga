"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

import { DICTIONARIES, type Dictionary } from "@/i18n/dictionaries";
import { LOCALE_COOKIE, LOCALE_MAX_AGE, type Locale } from "@/i18n/locale";

type LocaleValue = {
  locale: Locale;
  /** The words, already in the chosen language. */
  t: Dictionary;
  setLocale: (next: Locale) => void;
};

const LocaleContext = createContext<LocaleValue | null>(null);

/**
 * The language, and the words that go with it.
 *
 * Both dictionaries ship to the browser -- they are a few kilobytes and the
 * alternative is a round trip to read a word somebody has already chosen. So
 * switching is instant: the state changes, every screen re-renders in the
 * other language, and the cookie is written for the next visit and for the
 * pages the server renders.
 */
export function LocaleProvider({
  initial,
  children,
}: {
  /** What the cookie said when the server rendered this. */
  initial: Locale;
  children: React.ReactNode;
}) {
  const [locale, setLocale] = useState<Locale>(initial);

  const choose = useCallback((next: Locale) => {
    setLocale(next);

    try {
      document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=${LOCALE_MAX_AGE}; samesite=lax`;
    } catch {
      // A browser that refuses cookies still gets the language for this visit.
    }
  }, []);

  const value = useMemo(
    () => ({ locale, t: DICTIONARIES[locale], setLocale: choose }),
    [locale, choose],
  );

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}

/** The words. `const { t } = useLocale()` then `t.menu.matches`. */
export function useLocale() {
  const value = useContext(LocaleContext);
  if (!value) throw new Error("useLocale needs a LocaleProvider");
  return value;
}
