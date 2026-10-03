import {
  ageOn,
  categoryForAge,
  parseDay,
  type AgeCategory,
} from "./constants";
import { toDateInput } from "./date";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Today, as the app's time zone sees it: "yyyy-MM-dd". */
export const todayInput = (now = Date.now()) => toDateInput(now);

/** How old somebody is today, or null when nobody said when they were born. */
export function ageOf(birthDate: string | null, now = Date.now()) {
  return ageOn(birthDate, todayInput(now));
}

/** Their category today: Sub-18, Libre, Máster and the rest. */
export function categoryOf(
  birthDate: string | null,
  now = Date.now(),
): AgeCategory {
  return categoryForAge(ageOf(birthDate, now));
}

export function categoryLabel(birthDate: string | null, now = Date.now()) {
  return categoryOf(birthDate, now).label;
}

export function categoryColor(birthDate: string | null, now = Date.now()) {
  return categoryOf(birthDate, now).color;
}

/* -------------------------------------------------------------------------- */
/*                                  birthdays                                 */
/* -------------------------------------------------------------------------- */

export type NextBirthday = {
  /** The day it falls on, "yyyy-MM-dd". */
  date: string;
  /** Zero is today. */
  days: number;
  /** The age they turn on it. */
  turning: number;
};

const utc = (year: number, month: number, day: number) =>
  Date.UTC(year, month - 1, day);

const isLeap = (year: number) =>
  (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;

/**
 * The next time `birthDate` comes round, counting today.
 *
 * Worked out on calendar days, never on milliseconds, so "in 3 days" means three
 * midnights and not 72 hours from whenever the page loaded. Somebody born on
 * 29 February gets the 28th in the years that have no 29th.
 */
export function nextBirthday(
  birthDate: string | null,
  today: string,
): NextBirthday | null {
  const born = parseDay(birthDate);
  const now = parseDay(today);
  if (!born || !now) return null;

  const dayIn = (year: number) =>
    born.month === 2 && born.day === 29 && !isLeap(year) ? 28 : born.day;

  let year = now.year;
  if (utc(year, born.month, dayIn(year)) < utc(now.year, now.month, now.day)) {
    year += 1;
  }

  const day = dayIn(year);
  const days = Math.round(
    (utc(year, born.month, day) - utc(now.year, now.month, now.day)) / DAY_MS,
  );

  return {
    date: `${year}-${String(born.month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
    days,
    turning: year - born.year,
  };
}

/**
 * Everybody with a birthday on file, soonest first.
 *
 * `within` cuts the list to the ones coming up in that many days, today
 * included: what the notice at the top of the app reads.
 */
export function birthdaysAhead<T extends { birthDate: string | null }>(
  people: T[],
  today: string,
  within = Infinity,
) {
  return people
    .map((person) => ({ person, next: nextBirthday(person.birthDate, today) }))
    .filter(
      (entry): entry is { person: T; next: NextBirthday } =>
        !!entry.next && entry.next.days <= within,
    )
    .sort((left, right) => left.next.days - right.next.days);
}

/**
 * "14 de marzo de 1988", or "14 de marzo" without the year.
 *
 * Drawn in UTC on purpose: a birthday is a day on the calendar, not an instant,
 * and formatting it in any real zone risks showing the day before.
 */
export function formatBirthday(
  birthDate: string,
  lang: "en" | "es" = "en",
  withYear = true,
) {
  const day = parseDay(birthDate);
  if (!day) return birthDate;

  return new Intl.DateTimeFormat(lang === "es" ? "es-PE" : "en-US", {
    timeZone: "UTC",
    day: "numeric",
    month: "long",
    ...(withYear ? { year: "numeric" } : {}),
  }).format(Date.UTC(day.year, day.month - 1, day.day));
}
