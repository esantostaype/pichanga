import { formatDistanceToNowStrict } from "date-fns";
import { enUS, es as esLocale } from "date-fns/locale";

/**
 * Every date is rendered in one fixed zone, never in "whatever zone the
 * machine happens to be in".
 *
 * The server formats these during SSR, so relying on the local zone meant the
 * same match read 20:00 on a laptop in Lima and 01:00 on Vercel, which runs in
 * UTC. A match kicks off at a wall-clock time at the pitch, so that is the
 * zone everyone should see, wherever they open the app from.
 */
export const TIME_ZONE = process.env.NEXT_PUBLIC_TIME_ZONE || "America/Lima";

/**
 * Dates in the language the reader chose.
 *
 * `Intl` already knows how to say Saturday in both, so the only thing this
 * app has to carry is which one to ask for. Formatters are built once per
 * language and kept: they are not cheap to make and there are two of them.
 */
type Lang = "en" | "es";

const TAGS: Record<Lang, string> = { en: "en-US", es: "es-PE" };

const cache = new Map<string, Intl.DateTimeFormat>();

const formatter = (options: Intl.DateTimeFormatOptions, lang: Lang = "en") => {
  const key = lang + JSON.stringify(options);
  const kept = cache.get(key);
  if (kept) return kept;

  const made = new Intl.DateTimeFormat(TAGS[lang], {
    timeZone: TIME_ZONE,
    ...options,
  });

  cache.set(key, made);
  return made;
};

const LONG = { weekday: "long", month: "long", day: "numeric" } as const;
const SHORT = { month: "short", day: "numeric", year: "numeric" } as const;

const time = formatter({ hour: "2-digit", minute: "2-digit", hour12: false });
const weekdayName = formatter({ weekday: "short" });
const parts = formatter({
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

export const formatLongDate = (ms: number, lang: Lang = "en") =>
  formatter(LONG, lang).format(ms);

export const formatShortDate = (ms: number, lang: Lang = "en") =>
  formatter(SHORT, lang).format(ms);
export const formatTime = (ms: number) => time.format(ms);

/** "18:00 - 19:30" */
export const formatTimeRange = (playedAt: number, endsAt: number) =>
  `${formatTime(playedAt)} - ${formatTime(endsAt)}`;

/** Calendar fields of an instant, as seen in `TIME_ZONE`. */
function zonedParts(ms: number) {
  const found = parts.formatToParts(ms);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(found.find((part) => part.type === type)?.value);

  return {
    year: value("year"),
    month: value("month"),
    day: value("day"),
    // Intl renders midnight as "24" in some locales with hour12: false.
    hour: value("hour") % 24,
    minute: value("minute"),
    second: value("second"),
  };
}

/**
 * The readable id a match gets in its URL: `sep-2-2026`.
 *
 * Built from the calendar fields in the pitch's zone, so the address of a match
 * is the day it is played on, not the day it happens to be in UTC.
 */
export const matchSlug = (ms: number) => {
  const { year, month, day } = zonedParts(ms);
  return `${MONTH_SLUGS[month - 1]}-${day}-${year}`;
};

const MONTH_SLUGS = [
  "jan",
  "feb",
  "mar",
  "apr",
  "may",
  "jun",
  "jul",
  "aug",
  "sep",
  "oct",
  "nov",
  "dec",
] as const;

/** Values for the `date` and `time` inputs, in the pitch's zone. */
export const toDateInput = (ms: number) => {
  const { year, month, day } = zonedParts(ms);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
};

export const toTimeInput = (ms: number) => {
  const { hour, minute } = zonedParts(ms);
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
};

/** "yyyy-MM-dd" -> Date at midnight in the pitch's zone. */
export function fromDateInput(value: string): Date | undefined {
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return undefined;
  return new Date(toEpoch(value, "00:00"));
}

/** How far `TIME_ZONE` is from UTC at a given instant. */
function zoneOffsetMs(ms: number) {
  const { year, month, day, hour, minute, second } = zonedParts(ms);
  return Date.UTC(year, month - 1, day, hour, minute, second) - ms;
}

/**
 * Date (yyyy-MM-dd) + time (HH:mm) as typed at the pitch -> epoch ms.
 *
 * The offset is resolved twice because the first guess can land on the wrong
 * side of a DST change; the second pass uses the corrected instant. Peru has
 * no DST, but this keeps the helper honest anywhere else.
 */
export function toEpoch(date: string, time: string) {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = (time || "00:00").split(":").map(Number);

  const asIfUtc = Date.UTC(y, (m ?? 1) - 1, d ?? 1, hh ?? 0, mm ?? 0, 0, 0);
  const firstPass = asIfUtc - zoneOffsetMs(asIfUtc);

  return asIfUtc - zoneOffsetMs(firstPass);
}

/**
 * Default suggestion when creating a match: next Wednesday at 19:00 (today if
 * it is Wednesday and that time has not passed yet).
 */
export function suggestedMatchDate(now = Date.now()) {
  const DAY_MS = 24 * 60 * 60 * 1000;

  // Walks the next week looking for the first Wednesday 19:00 still ahead.
  for (let offset = 0; offset <= 7; offset++) {
    const day = toDateInput(now + offset * DAY_MS);
    if (weekdayName.format(toEpoch(day, "12:00")) !== "Wed") continue;

    const kickOff = toEpoch(day, "19:00");
    if (kickOff > now) return kickOff;
  }

  return toEpoch(toDateInput(now + 7 * DAY_MS), "19:00");
}

/** True between kick-off and the final whistle. */
export const isLive = (playedAt: number, endsAt: number, now: number) =>
  now >= playedAt && now < endsAt;

/** "Today", "Tomorrow", "in 3 days" or "2 days ago", in either language. */
export function relativeLabel(
  ms: number,
  now = Date.now(),
  lang: Lang = "en",
  words: { today: string; tomorrow: string } = {
    today: "Today",
    tomorrow: "Tomorrow",
  },
) {
  const day = toDateInput(ms);

  if (day === toDateInput(now)) return words.today;
  if (day === toDateInput(now + 24 * 60 * 60 * 1000)) return words.tomorrow;

  // `addSuffix` rather than gluing "ago" on afterwards: Spanish puts it in
  // front ("hace 2 dias") and only the locale knows that.
  return formatDistanceToNowStrict(new Date(ms), {
    addSuffix: true,
    locale: lang === "es" ? esLocale : enUS,
  });
}
