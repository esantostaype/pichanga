"use client";

import { ArrowLeft01Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";

/**
 * One page at a time, for a list long enough to be worth cutting up.
 *
 * Renders nothing at all while everything fits on one page: a pager with both
 * arrows dead is just furniture.
 */
export function Pager({
  page,
  pages,
  onChange,
}: {
  /** One-based, so it reads the same as what is on screen. */
  page: number;
  pages: number;
  onChange: (page: number) => void;
}) {
  if (pages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-3">
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Previous page"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
      >
        <Icon icon={ArrowLeft01Icon} size={16} />
      </Button>

      <p className="text-xs uppercase tracking-wider text-muted-foreground">
        <span className="tabular-nums text-foreground">{page}</span> of{" "}
        <span className="tabular-nums">{pages}</span>
      </p>

      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Next page"
        disabled={page >= pages}
        onClick={() => onChange(page + 1)}
      >
        <Icon icon={ArrowRight01Icon} size={16} />
      </Button>
    </div>
  );
}
