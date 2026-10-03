"use client";

import { Calendar03Icon } from "@hugeicons/core-free-icons";
import { useState } from "react";

import { Calendar } from "@/components/ui/calendar";
import { PickerTrigger } from "@/components/ui/picker-trigger";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { MAX_AGE } from "@/lib/constants";
import { formatShortDate, fromDateInput, toDateInput } from "@/lib/date";
import { useLocale } from "@/components/providers/locale-provider";

type DatePickerProps = {
  /** "yyyy-MM-dd", same contract as the native date input it replaces. */
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  invalid?: boolean;
  className?: string;
  /**
   * A date of birth rather than a match day: month and year dropdowns, since
   * nobody should have to click back thirty years one month at a time, and
   * nothing after today.
   */
  birthday?: boolean;
};

export function DatePicker({
  value,
  onChange,
  disabled,
  placeholder,
  invalid,
  className,
  birthday,
}: DatePickerProps) {
  const { t, locale } = useLocale();
  const [open, setOpen] = useState(false);
  const selected = value ? fromDateInput(value) : undefined;

  const today = new Date();
  const birthdayProps = birthday
    ? {
        captionLayout: "dropdown" as const,
        hideNavigation: true,
        startMonth: new Date(today.getFullYear() - MAX_AGE, 0),
        endMonth: today,
        disabled: { after: today },
        // Somewhere a grown-up squad is likely to be born, until one is picked.
        defaultMonth:
          selected ?? new Date(today.getFullYear() - 25, today.getMonth()),
      }
    : { defaultMonth: selected };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <PickerTrigger
          icon={Calendar03Icon}
          placeholder={placeholder ?? t.common.pickDate}
          invalid={invalid}
          disabled={disabled}
          className={className}
          display={
            selected ? <span>{formatShortDate(selected.getTime(), locale)}</span> : null
          }
        />
      </PopoverTrigger>

      <PopoverContent className="w-auto p-3">
        <Calendar
          mode="single"
          autoFocus
          selected={selected}
          {...birthdayProps}
          onSelect={(date) => {
            if (!date) return;
            onChange(toDateInput(date.getTime()));
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
