"use client";

import { useLocale } from "@/components/providers/locale-provider";
import { Badge } from "@/components/ui/badge";
import { areaLabel } from "@/i18n/dictionaries";
import { getArea } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function AreaBadge({
  area,
  className,
}: {
  area: string;
  className?: string;
}) {
  const { t } = useLocale();
  const { color } = getArea(area);

  return (
    <Badge
      className={cn("border-transparent", className)}
      style={{ color, backgroundColor: `${color}1f` }}
    >
      <span
        aria-hidden
        className="size-1.5 rounded-full"
        style={{ backgroundColor: color }}
      />
      {areaLabel(t, area)}
    </Badge>
  );
}

export function areaColor(area: string) {
  return getArea(area).color;
}
