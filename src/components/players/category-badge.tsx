"use client";

import { useLocale } from "@/components/providers/locale-provider";
import { Badge } from "@/components/ui/badge";
import { fill } from "@/i18n/dictionaries";
import { ageOf, categoryOf } from "@/lib/age";
import { cn } from "@/lib/utils";

/**
 * Their age category, in its colour: `Máster · 42`.
 *
 * Worked out from the birthday on the day it is drawn, so the badge moves a
 * player up on its own the morning they turn thirty-five.
 */
export function CategoryBadge({
  birthDate,
  showAge = true,
  className,
}: {
  birthDate: string | null;
  showAge?: boolean;
  className?: string;
}) {
  const { t } = useLocale();
  const { color, label } = categoryOf(birthDate);
  const age = ageOf(birthDate);

  return (
    <Badge
      className={cn("border-transparent", className)}
      style={{ color, backgroundColor: `${color}1f` }}
    >
      <span
        aria-hidden
        className="size-1.5 rounded-full"
        style={{ backgroundColor: color }}
      />
      {age === null ? t.players.noBirthday : label}
      {showAge && age !== null ? (
        <span className="opacity-70">
          · {fill(t.players.age, { age })}
        </span>
      ) : null}
    </Badge>
  );
}
