"use client";

import * as React from "react";

import { Icon, type IconSvgElement } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

type PickerTriggerProps = React.ComponentProps<"button"> & {
  icon: IconSvgElement;
  /** Rendered when there is no value yet. */
  placeholder: string;
  /** Formatted value; falsy shows the placeholder. */
  display?: React.ReactNode;
  invalid?: boolean;
};

/**
 * Shared field-looking trigger for the date and time pickers, so both popovers
 * are pixel-identical and only differ in their icon and content.
 */
export function PickerTrigger({
  icon,
  placeholder,
  display,
  invalid,
  className,
  ...props
}: PickerTriggerProps) {
  return (
    <button
      type="button"
      // `aria-invalid` is not valid on role=button, so the error state travels
      // as a data attribute.
      data-invalid={invalid ? "true" : undefined}
      className={cn(
        "cursor-pointer flex h-10 w-full items-center gap-2 rounded-xl border border-input bg-muted/40 px-3.5 text-left text-sm transition-colors",
        "hover:border-primary/40 focus-visible:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "data-[invalid=true]:border-destructive/70",
        className,
      )}
      {...props}
    >
      <Icon icon={icon} size={16} className="text-muted-foreground" />
      {display ? (
        <span className="truncate">{display}</span>
      ) : (
        <span className="text-muted-foreground/70">{placeholder}</span>
      )}
    </button>
  );
}
