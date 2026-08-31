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
};

export function DatePicker({
  value,
  onChange,
  disabled,
  placeholder,
  invalid,
  className,
}: DatePickerProps) {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const selected = value ? fromDateInput(value) : undefined;

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
            selected ? <span>{formatShortDate(selected.getTime())}</span> : null
          }
        />
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
