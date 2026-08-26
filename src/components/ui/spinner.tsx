import * as React from "react";

import { cn } from "@/lib/utils";

export function Spinner({
  className,
  size = 16,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <span
      role="status"
      aria-label="Loading"
      style={{ width: size, height: size, borderWidth: Math.max(2, size / 9) }}
      className={cn(
        "inline-block shrink-0 animate-spin rounded-full border-current border-t-transparent opacity-80",
        className,
      )}
    />
  );
}
