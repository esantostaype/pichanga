"use client";

import {
  ArrowDown01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
} from "@hugeicons/core-free-icons";
import {
  DayPicker,
  type DayPickerProps,
  type DropdownProps,
} from "react-day-picker";
import { enUS, es } from "react-day-picker/locale";

import { useLocale } from "@/components/providers/locale-provider";
import { buttonVariants } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

/**
 * react-day-picker styled with the project tokens. No stylesheet from the
 * library is imported: every element is themed through `classNames`.
 */
function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: DayPickerProps) {
  const { locale } = useLocale();

  return (
    <DayPicker
      locale={locale === "es" ? es : enUS}
      showOutsideDays={showOutsideDays}
      className={cn("relative", className)}
      classNames={{
        months: "flex flex-col gap-4",
        month: "flex flex-col gap-3",
        month_caption: "flex h-8 items-center",
        caption_label:
          "inline-flex items-center gap-1 font-display text-sm uppercase tracking-[0.08em] text-foreground",
        nav: "absolute right-0 top-0 z-10 flex items-center gap-1",
        /* Month and year as dropdowns: see `CalendarDropdown` below. */
        dropdowns: "flex items-center gap-2",
        button_previous: cn(
          buttonVariants({ variant: "ghost", size: "icon-sm" }),
          "text-muted-foreground hover:text-foreground disabled:opacity-40",
        ),
        button_next: cn(
          buttonVariants({ variant: "ghost", size: "icon-sm" }),
          "text-muted-foreground hover:text-foreground disabled:opacity-40",
        ),
        month_grid: "w-full border-collapse",
        weekdays: "flex",
        weekday:
          "w-9 text-[0.65rem] font-medium uppercase tracking-[0.1em] text-muted-foreground",
        weeks: "",
        week: "flex w-full mt-1",
        day: "size-9 p-0 text-center text-sm",
        day_button: cn(
          "size-9 rounded-lg font-normal transition-colors",
          "hover:bg-accent hover:text-accent-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
        ),
        selected:
          "[&>button]:bg-primary [&>button]:text-primary-foreground [&>button]:hover:bg-primary [&>button]:hover:text-primary-foreground",
        today: "[&>button]:border [&>button]:border-primary/60",
        outside: "text-muted-foreground/40",
        disabled: "text-muted-foreground/30 pointer-events-none",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Dropdown: CalendarDropdown,
        Chevron: ({ orientation }) => (
          <Icon
            icon={
              orientation === "left"
                ? ArrowLeft01Icon
                : orientation === "down"
                  ? ArrowDown01Icon
                  : ArrowRight01Icon
            }
            size={15}
          />
        ),
      }}
      {...props}
    />
  );
}

/**
 * Month and year, with the app's own select instead of the browser's.
 *
 * The native one opened a white system list in the middle of a dark popover,
 * in whatever language the operating system speaks. This is the same Radix
 * select the forms use -- same panel, same fade and zoom in and out -- and it
 * hands the picker back the change event it expects from a `<select>`.
 */
function CalendarDropdown({
  options,
  value,
  onChange,
  disabled,
  "aria-label": ariaLabel,
}: DropdownProps) {
  const selected = options?.find((option) => option.value === Number(value));

  return (
    <Select
      value={value === undefined ? undefined : String(value)}
      disabled={disabled}
      onValueChange={(next) =>
        onChange?.({
          target: { value: next },
        } as React.ChangeEvent<HTMLSelectElement>)
      }
    >
      <SelectTrigger
        aria-label={ariaLabel}
        className="h-8 w-auto gap-1.5 rounded-lg border-border/60 bg-transparent px-2.5 font-display text-sm uppercase tracking-[0.08em] hover:bg-accent"
      >
        {selected?.label}
      </SelectTrigger>
      <SelectContent className="max-h-64">
        {options?.map((option) => (
          <SelectItem
            key={option.value}
            value={String(option.value)}
            disabled={option.disabled}
            className="py-1.5 capitalize"
          >
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export { Calendar };
