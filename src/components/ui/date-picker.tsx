"use client";

import { Calendar03Icon } from "@hugeicons/core-free-icons";
import { useState } from "react";

import { Calendar } from "@/components/ui/calendar";
import { Icon } from "@/components/ui/icon";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { formatShortDate, fromDateInput, toDateInput } from "@/lib/date";
import { cn } from "@/lib/utils";

type DatePickerProps = {
  /** "yyyy-MM-dd", same contract as the native date input it replaces. */
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  invalid?: boolean;
  className?: string;
};

export function DatePicker({
  value,
  onChange,
  disabled,
  placeholder = "Pick a date",
  invalid,
  className,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const selected = value ? fromDateInput(value) : undefined;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          // `aria-invalid` is not valid on role=button, so the error state
          // travels as a data attribute.
          data-invalid={invalid ? "true" : undefined}
          className={cn(
            "flex h-10 w-full items-center gap-2 rounded-xl border border-input bg-muted/40 px-3.5 text-left text-sm transition-colors",
            "hover:border-primary/40 focus-visible:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "data-[invalid=true]:border-destructive/70",
            className,
          )}
        >
          <Icon
            icon={Calendar03Icon}
            size={16}
            className="text-muted-foreground"
          />
          {selected ? (
            <span suppressHydrationWarning>
              {formatShortDate(selected.getTime())}
            </span>
          ) : (
            <span className="text-muted-foreground/70">{placeholder}</span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent className="w-auto p-3">
        <Calendar
          mode="single"
          autoFocus
          selected={selected}
          defaultMonth={selected}
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
