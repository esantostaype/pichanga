import "server-only";

import { cookies } from "next/headers";

import { DICTIONARIES } from "./dictionaries";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale } from "./locale";

/** The language this request is in, for anything the server renders. */
export async function getLocale() {
  const store = await cookies();
  const chosen = store.get(LOCALE_COOKIE)?.value;
  return isLocale(chosen) ? chosen : DEFAULT_LOCALE;
}

/** The words, on the server. */
export async function getDictionary() {
  return DICTIONARIES[await getLocale()];
}

/**
 * What the server says when it refuses something.
 *
 * Read per request rather than once at module load: the cookie is different
 * for every person hitting the same deployment, and a message cached from
 * whoever asked first would answer the next one in their language.
 */
export async function messages() {
  return (await getDictionary()).api;
}
