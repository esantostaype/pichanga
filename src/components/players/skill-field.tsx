"use client";

import { SKILL_MAX, SKILL_MIN } from "@/lib/constants";
import { cn } from "@/lib/utils";

/**
 * One skill, as five buttons.
 *
 * A slider would be fewer pixels and worse: this is a rating out of five, and
 * the whole point is that setting it takes one tap and reading it takes none.
 * Six of these have to be filled in for every player, so the cost of each one
 * is what decides whether the feature gets used at all.
 */
export function SkillField({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}) {
  const steps = Array.from(
    { length: SKILL_MAX - SKILL_MIN + 1 },
    (_, index) => SKILL_MIN + index,
  );

  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-muted-foreground">{label}</span>

      <div
        role="radiogroup"
        aria-label={label}
        className="flex items-center gap-1"
      >
        {steps.map((step) => (
          <button
            key={step}
            type="button"
            role="radio"
            aria-checked={value === step}
            aria-label={`${label}: ${step}`}
            disabled={disabled}
            onClick={() => onChange(step)}
            className={cn(
              "size-7 cursor-pointer rounded-lg text-xs tabular-nums transition-colors",
              "disabled:cursor-default disabled:opacity-50",
              // Everything up to the chosen number is lit, so the rating reads
              // as a level rather than as one number among five.
              step <= value
                ? "bg-primary font-semibold text-primary-foreground"
                : "bg-secondary text-muted-foreground hover:text-foreground",
            )}
          >
            {step}
          </button>
        ))}
      </div>
    </div>
  );
}
