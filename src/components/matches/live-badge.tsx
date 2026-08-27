"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/** "Live" with a pulsing dot, for a match being played right now. */
export function LiveBadge({ className }: { className?: string }) {
  return (
    <Badge
      className={cn(
        "border-destructive/40 bg-destructive/15 text-destructive",
        className,
      )}
    >
      <span aria-hidden className="relative flex size-1.5">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-destructive opacity-75" />
        <span className="relative inline-flex size-1.5 rounded-full bg-destructive" />
      </span>
      Live
    </Badge>
  );
}
