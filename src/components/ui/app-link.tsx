"use client";

import Link from "next/link";
import type { MouseEvent, ReactNode } from "react";

import { Icon, type IconSvgElement } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

/**
 * Every link in the app, so they all read as links: a solid underline under the
 * words and the app's lime on hover.
 *
 * The icon belongs inside the link, not beside it. Outside, the hover stopped at
 * the first letter and the icon stayed grey while the text went green, which
 * made the pair look like two unrelated things. The underline stays on the words
 * alone -- a line under a glyph reads as a rendering fault.
 *
 * It also renders a button, for the places that open a dialog instead of going
 * somewhere. That is still a link to the reader, and it should not be the one
 * that looks different.
 */
export function AppLink({
  href,
  external,
  onClick,
  icon,
  trailingIcon,
  iconSize = 15,
  className,
  labelClassName,
  title,
  ariaLabel,
  children,
}: {
  /** Absent for the button form, which only has an `onClick`. */
  href?: string;
  /** Opens in a new tab, safely. */
  external?: boolean;
  onClick?: (event: MouseEvent<HTMLElement>) => void;
  icon?: IconSvgElement;
  trailingIcon?: IconSvgElement;
  iconSize?: number;
  className?: string;
  /** For the label alone: `tabular-nums`, a weight, a colour. */
  labelClassName?: string;
  title?: string;
  ariaLabel?: string;
  children: ReactNode;
}) {
  const shared = cn(
    "inline-flex max-w-full cursor-pointer items-center gap-2 rounded-sm text-left no-underline transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
    className,
  );

  const content = (
    <>
      {icon ? <Icon icon={icon} size={iconSize} /> : null}
      <span
        className={cn(
          "min-w-0 truncate underline decoration-1 underline-offset-4",
          labelClassName,
        )}
      >
        {children}
      </span>
      {trailingIcon ? <Icon icon={trailingIcon} size={iconSize} /> : null}
    </>
  );

  if (!href) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={shared}
        title={title}
        aria-label={ariaLabel}
      >
        {content}
      </button>
    );
  }

  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={onClick}
        className={shared}
        title={title}
        aria-label={ariaLabel}
      >
        {content}
      </a>
    );
  }

  return (
    <Link
      href={href}
      onClick={onClick}
      className={shared}
      title={title}
      aria-label={ariaLabel}
    >
      {content}
    </Link>
  );
}
