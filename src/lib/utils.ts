import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** "Diego" + "Maradona" -> "DM" */
export function initialsOf(firstName: string, lastName: string) {
  return `${firstName.trim().charAt(0)}${lastName.trim().charAt(0)}`.toUpperCase();
}

/** First name + first surname, so the pitch layout never breaks. */
export function shortName(firstName: string, lastName: string) {
  return `${firstName.trim().split(/\s+/)[0]} ${lastName.trim().split(/\s+/)[0]}`;
}

const DIACRITICS = /[̀-ͯ]/g;

/** Lowercase and stripped of diacritics, so search ignores accents. */
export function normalize(value: string) {
  return value.toLowerCase().normalize("NFD").replace(DIACRITICS, "");
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
