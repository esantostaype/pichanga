import * as React from "react";

import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        // Against a #131417 card, `bg-muted` was a shade away from invisible.
        "animate-pulse rounded-xl bg-muted-foreground/25",
        className,
      )}
      {...props}
    />
  );
}

export { Skeleton };
