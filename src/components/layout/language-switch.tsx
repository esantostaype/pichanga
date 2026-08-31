"use client";

import { useLocale } from "@/components/providers/locale-provider";
import { LOCALES, type Locale } from "@/i18n/locale";
import { cn } from "@/lib/utils";

/**
 * Two words, one of them lit.
 *
 * Not a dropdown: there are two languages and a dropdown to choose between two
 * things is a dropdown too many. It changes the screen on the spot -- both
 * dictionaries are already here -- and writes the cookie for next time.
 */
export function LanguageSwitch({ className }: { className?: string }) {
  const { locale, t, setLocale } = useLocale();

  return (
    <span
      role="group"
      aria-label={t.language.label}
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full border border-border/60 bg-background/60 p-0.5 backdrop-blur-md",
        className,
      )}
    >
      {LOCALES.map((one) => (
        <button
          key={one}
          type="button"
          aria-pressed={one === locale}
          onClick={() => setLocale(one as Locale)}
          className={cn(
            "cursor-pointer rounded-full px-2.5 py-1 font-display text-xs uppercase tracking-[0.12em] transition-colors",
            one === locale
              ? "bg-primary/15 text-primary"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {one === "en" ? "EN" : "ES"}
        </button>
      ))}
    </span>
  );
}
