"use client";

import { useLocale } from "@/components/providers/locale-provider";
import { fill } from "@/i18n/dictionaries";
import { useLiveVisitors } from "@/hooks/use-presence";

/**
 * How many people have the app open right now, as a quiet line in the corner.
 *
 * Only rendered for the super admin, and the number itself only ever leaves
 * the server for that session: see `api/presence`.
 */
export function LiveVisitors() {
  const { t } = useLocale();
  const count = useLiveVisitors();

  // Null while the first poll is in flight, or if it failed: an empty corner
  // beats a wrong number.
  if (count === null) return null;

  return (
    <p className="flex items-center gap-2 text-sm text-muted-foreground/80 ml-6">
      <span aria-hidden className="relative flex size-1.5 shrink-0">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex size-1.5 rounded-full bg-emerald-400" />
      </span>

      <span className="truncate">
        {fill(count === 1 ? t.live.watchingOne : t.live.watchingMany, {
          count,
        })}
      </span>
    </p>
  );
}
