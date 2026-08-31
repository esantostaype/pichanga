"use client";

import { Cancel01Icon, Delete02Icon } from "@hugeicons/core-free-icons";

import { Button } from "@/components/ui/button";
import { useLocale } from "@/components/providers/locale-provider";
import { fill } from "@/i18n/dictionaries";
import { Icon } from "@/components/ui/icon";

/** Appears above a table once rows are ticked. */
export function BulkBar({
  count,
  noun,
  onDelete,
  onClear,
  disabled,
}: {
  count: number;
  /** Already in the reader's language, already pluralised by the caller. */
  noun: string;
  onDelete: () => void;
  onClear: () => void;
  disabled?: boolean;
}) {
  const { t } = useLocale();
  if (count === 0) return null;

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary/10 px-3 py-2">
      <p className="text-sm font-medium">
        {fill(t.common.selected, { count, noun })}
      </p>

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={onClear}
          disabled={disabled}
          aria-label={t.common.close}
        >
          <Icon icon={Cancel01Icon} size={14} />
          {t.common.clear}
        </Button>
        <Button
          variant="destructive"
          size="sm"
          onClick={onDelete}
          disabled={disabled}
        >
          <Icon icon={Delete02Icon} size={14} />
          {t.common.delete}
        </Button>
      </div>
    </div>
  );
}
