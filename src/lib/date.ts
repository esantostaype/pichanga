import {
  format,
  formatDistanceToNowStrict,
  isPast,
  isToday,
  isTomorrow,
} from "date-fns";
import { enUS } from "date-fns/locale";

const opts = { locale: enUS } as const;

export const formatLongDate = (ms: number) =>
  format(new Date(ms), "EEEE, MMMM d", opts);

export const formatShortDate = (ms: number) =>
  format(new Date(ms), "MMM d, yyyy", opts);

export const formatTime = (ms: number) => format(new Date(ms), "HH:mm", opts);

/** Values for the `date` and `time` inputs. */
export const toDateInput = (ms: number) => format(new Date(ms), "yyyy-MM-dd");
export const toTimeInput = (ms: number) => format(new Date(ms), "HH:mm");

/** "yyyy-MM-dd" -> local Date, built part by part to avoid a UTC shift. */
export function fromDateInput(value: string): Date | undefined {
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return undefined;
  return new Date(y, m - 1, d);
}

/**
 * Default suggestion when creating a match: next Wednesday at 19:00 (today if
 * it is Wednesday and that time has not passed yet).
 */
export function suggestedMatchDate(now = new Date()) {
  const WEDNESDAY = 3;
  const suggestion = new Date(now);
  suggestion.setHours(19, 0, 0, 0);

  const daysAhead = (WEDNESDAY - suggestion.getDay() + 7) % 7;
  const alreadyPassed = daysAhead === 0 && now.getTime() > suggestion.getTime();

  suggestion.setDate(suggestion.getDate() + (alreadyPassed ? 7 : daysAhead));

  return suggestion.getTime();
}

/** "Today", "Tomorrow", "in 3 days" or "2 days ago". */
export function relativeLabel(ms: number) {
  const date = new Date(ms);

  if (isToday(date)) return "Today";
  if (isTomorrow(date)) return "Tomorrow";

  const distance = formatDistanceToNowStrict(date, opts);
  return isPast(date) ? `${distance} ago` : `in ${distance}`;
}
