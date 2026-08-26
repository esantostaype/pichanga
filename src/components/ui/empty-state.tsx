import * as React from "react";

import { Icon, type IconSvgElement } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon: IconSvgElement;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border/70 px-6 py-14 text-center",
        className,
      )}
    >
      <span className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon icon={icon} size={22} />
      </span>
      <div className="space-y-1">
        <p className="font-display text-lg uppercase tracking-[0.08em]">
          {title}
        </p>
        {description ? (
          <p className="text-md text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}
