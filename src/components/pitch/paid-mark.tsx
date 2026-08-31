"use client";

import {
  MoneyNotFound01Icon,
  PaymentSuccess01Icon,
} from "@hugeicons/core-free-icons";

import { useLocale } from "@/components/providers/locale-provider";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

/**
 * Whether a player has settled the rental: a receipt when they have, a red
 * empty wallet when they have not.
 *
 * A button when the viewer is allowed to change it, plain text when not, so
 * the cursor never promises something the server will refuse. Shared by the
 * pitch tokens and the list, which are two ways of showing the same lineup.
 */
export function PaidMark({
  paid,
  side,
  className,
  onToggle,
}: {
  paid: boolean;
  /** Diameter in px, so it can follow a token or sit in a row. */
  side: number;
  className?: string;
  onToggle?: () => void;
}) {
  const { t } = useLocale();
  const label = paid ? t.pitch.paid : t.pitch.notPaid;

  const shape = cn(
    "grid shrink-0 place-items-center rounded-full border shadow-lg transition-colors",
    paid
      ? "border-emerald-300/40 bg-emerald-500 text-white"
      : "border-red-400/40 bg-red-500/95 text-white",
    onToggle &&
      "cursor-pointer hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70",
    className,
  );

  const content = (
    <>
      <span className="sr-only">{label}</span>
      <Icon
        icon={paid ? PaymentSuccess01Icon : MoneyNotFound01Icon}
        size={Math.max(10, side * 0.6)}
        strokeWidth={2}
      />
    </>
  );

  if (!onToggle) {
    return (
      <span
        title={label}
        className={shape}
        style={{ width: side, height: side }}
      >
        {content}
      </span>
    );
  }

  return (
    <button
      type="button"
      title={label}
      aria-pressed={paid}
      onClick={onToggle}
      className={shape}
      style={{ width: side, height: side }}
    >
      {content}
    </button>
  );
}
