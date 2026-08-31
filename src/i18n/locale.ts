/** The two the office speaks. */
export const LOCALES = ["en", "es"] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

/**
 * Where the choice lives.
 *
 * A cookie rather than the address, because the language belongs to the person
 * and not to the page: sharing a link to Wednesday's lineup should not hand
 * somebody else your language, and every screen here is one address the whole
 * office opens.
 *
 * Readable by JavaScript on purpose -- the switch writes it and the server
 * reads it back on the next request, so nothing has to round-trip to change a
 * language.
 */
export const LOCALE_COOKIE = "pichanga_lang";

/** A year: long enough that nobody picks twice. */
export const LOCALE_MAX_AGE = 60 * 60 * 24 * 365;

export const isLocale = (value: unknown): value is Locale =>
  typeof value === "string" && LOCALES.includes(value as Locale);
