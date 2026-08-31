"use client";

import { Time04Icon } from "@hugeicons/core-free-icons";
import { useEffect, useRef, useState } from "react";

import { PickerTrigger } from "@/components/ui/picker-trigger";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useLocale } from "@/components/providers/locale-provider";
import { cn } from "@/lib/utils";

type TimePickerProps = {
  /** "HH:mm", same contract as the native time input it replaces. */
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  invalid?: boolean;
  /** Granularity of the minutes column. */
  minuteStep?: number;
  className?: string;
};

const pad = (n: number) => String(n).padStart(2, "0");

const HOURS = Array.from({ length: 24 }, (_, i) => i);

/** Parses "HH:mm" leniently: an empty or malformed value selects nothing. */
function parse(value: string) {
  const [h, m] = value.split(":").map(Number);
  return {
    hour: Number.isInteger(h) && h >= 0 && h < 24 ? h : null,
    minute: Number.isInteger(m) && m >= 0 && m < 60 ? m : null,
  };
}

export function TimePicker({
  value,
  onChange,
  disabled,
  placeholder,
  invalid,
  minuteStep = 5,
  className,
}: TimePickerProps) {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const { hour, minute } = parse(value);

  const minutes = Array.from(
    { length: Math.ceil(60 / minuteStep) },
    (_, i) => i * minuteStep,
  );

  const commit = (nextHour: number, nextMinute: number) =>
    onChange(`${pad(nextHour)}:${pad(nextMinute)}`);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <PickerTrigger
          icon={Time04Icon}
          placeholder={placeholder ?? t.common.pickTime}
          invalid={invalid}
          disabled={disabled}
          className={className}
          display={hour !== null && minute !== null ? value : null}
        />
      </PopoverTrigger>

      <PopoverContent className="w-auto p-3">
        <div className="flex gap-2">
          <TimeColumn
            label={t.common.hour}
            options={HOURS}
            selected={hour}
            onSelect={(next) => commit(next, minute ?? 0)}
          />
          <TimeColumn
            label={t.common.minute}
            options={minutes}
            selected={minute}
            onSelect={(next) => {
              commit(hour ?? 0, next);
              // Minutes are the last field to fill, so the choice is complete.
              setOpen(false);
            }}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}

function TimeColumn({
  label,
  options,
  selected,
  onSelect,
}: {
  label: string;
  options: number[];
  selected: number | null;
  onSelect: (value: number) => void;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);

  // Centre the current value once, when the popover mounts. Scrolling the
  // container directly avoids `scrollIntoView` dragging the page with it.
  useEffect(() => {
    const list = listRef.current;
    const active = activeRef.current;
    if (!list || !active) return;

    list.scrollTop =
      active.offsetTop - list.clientHeight / 2 + active.clientHeight / 2;
  }, []);

  return (
    <div className="flex flex-col gap-2">
      <span className="px-1 text-[0.65rem] font-medium uppercase tracking-[0.1em] text-muted-foreground">
        {label}
      </span>

      <div
        ref={listRef}
        className="h-56 w-14 overflow-y-auto scrollbar-thin pr-1"
      >
        <div className="flex flex-col gap-1">
          {options.map((option) => {
            const isSelected = option === selected;

            return (
              <button
                key={option}
                type="button"
                ref={isSelected ? activeRef : undefined}
                onClick={() => onSelect(option)}
                aria-pressed={isSelected}
                className={cn(
                  "cursor-pointer h-9 shrink-0 rounded-lg text-center text-sm font-normal transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                  isSelected
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-accent hover:text-accent-foreground",
                )}
              >
                {pad(option)}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
