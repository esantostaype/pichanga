import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";

import { cn } from "@/lib/utils";

type IconProps = {
  icon: IconSvgElement;
  className?: string;
  size?: number;
  strokeWidth?: number;
};

/** Single Hugeicons wrapper: keeps stroke width and sizing consistent. */
export function Icon({
  icon,
  className,
  size = 18,
  strokeWidth = 1.8,
}: IconProps) {
  return (
    <HugeiconsIcon
      icon={icon}
      size={size}
      strokeWidth={strokeWidth}
      className={cn("shrink-0", className)}
    />
  );
}

export type { IconSvgElement };
