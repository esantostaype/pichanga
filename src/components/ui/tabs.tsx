"use client";

import { ArrowDown01Icon } from "@hugeicons/core-free-icons";
import { useLayoutEffect, useRef, useState } from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import { useLocale } from "@/components/providers/locale-provider";
import { fill } from "@/i18n/dictionaries";

export type TabItem = {
  value: string;
  label: string;
};

/** The gap between tabs, in px. Must match the `gap-1` below. */
const GAP = 4;

/**
 * Tabs that take the width of their words.
 *
 * They used to stretch across whatever they sat in, which made two tabs read as
 * a segmented control and five as a navigation bar. Sized to their text, a tab
 * is a tab.
 *
 * When they no longer fit, the tail collapses into a **+N** at the end that
 * opens the rest in a dropdown -- so a narrow drawer shows three tabs and a
 * plus rather than a row scrolled off its own edge. The measurement runs
 * against the container, not against the row, because the row's width is our
 * own output: measuring that is how a layout ends up hiding one more tab on
 * every pass.
 */
export function Tabs({
  items,
  value,
  onChange,
  className,
  ariaLabel,
}: {
  items: TabItem[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
  ariaLabel?: string;
}) {
  const { t: words } = useLocale();
  const wrap = useRef<HTMLDivElement>(null);
  const probe = useRef<HTMLDivElement>(null);

  /* Everything shows on the first paint; the measurement then takes some away. */
  const [visible, setVisible] = useState(items.length);

  useLayoutEffect(() => {
    const measure = () => {
      const box = wrap.current;
      const shadow = probe.current;
      if (!box || !shadow) return;

      // The wrapper is `w-full`, so its width comes from the layout around it
      // rather than from the tabs inside it.
      const available = box.clientWidth - 8; // the row's own padding
      if (available <= 0) return;

      const nodes = Array.from(shadow.children) as HTMLElement[];
      const widths = nodes
        .slice(0, items.length)
        .map((node) => node.offsetWidth);
      const trigger = nodes[items.length]?.offsetWidth ?? 56;

      const everything =
        widths.reduce((total, width) => total + width, 0) +
        GAP * Math.max(0, items.length - 1);

      // A pixel of tolerance: the probe and the container round differently,
      // and without it a borderline row flickers one tab in and out.
      if (everything <= available + 1) {
        setVisible(items.length);
        return;
      }

      let used = 0;
      let count = 0;

      for (const width of widths) {
        const step = (count > 0 ? GAP : 0) + width;
        if (used + step + trigger + GAP > available) break;
        used += step;
        count += 1;
      }

      // Never nothing: a row with only a +N in it says less than one tab does.
      setVisible(Math.max(1, count));
    };

    measure();

    const box = wrap.current;
    if (!box) return;

    const observer = new ResizeObserver(measure);
    observer.observe(box);
    return () => observer.disconnect();
  }, [items]);

  /*
   * The row never reorders itself.
   *
   * Picking from the dropdown used to pull that tab to the front, which moved
   * the tabs somebody had just read while they were reading them. The trigger
   * carries the state instead: it lights up while the selection is one of the
   * ones it is holding, and the selection is marked inside it.
   */
  const shown = items.slice(0, visible);
  const hidden = items.slice(visible);

  return (
    // `min-w-0` matters: inside a grid or a flex row a box may grow past its
    // container to fit its content, and a row that can grow never has to
    // collapse -- it makes its parent scroll sideways instead.
    <div ref={wrap} className={cn("relative w-full min-w-0", className)}>
      {/*
        Measured, never seen, and out of everybody's way: clipped to the
        wrapper, because an absolutely positioned box still counts towards an
        ancestor's scroll width -- which is where the sideways scrollbar came
        from. Plain spans, so no tab is announced twice.
      */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden opacity-0"
      >
        <div ref={probe} className="flex w-max">
          {items.map((item) => (
            <span key={item.value} className={cn(tabClass, "font-semibold")}>
              {item.label}
            </span>
          ))}
          <span className={triggerClass}>+{items.length}</span>
        </div>
      </div>

      <div
        role="tablist"
        aria-label={ariaLabel}
        className="inline-flex max-w-full items-center gap-1 rounded-xl border border-border/60 bg-background/60 p-1"
      >
        {shown.map((item) => (
          <Tab
            key={item.value}
            item={item}
            selected={item.value === value}
            onSelect={() => onChange(item.value)}
          />
        ))}

        {hidden.length > 0 ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label={fill(words.common.more, { count: hidden.length })}
                className={cn(
                  triggerClass,
                  "cursor-pointer transition-colors hover:text-foreground",
                  hidden.some((item) => item.value === value) &&
                    "bg-primary/15 text-primary",
                )}
              >
                +{hidden.length}
                <Icon icon={ArrowDown01Icon} size={13} />
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end">
              {hidden.map((item) => (
                <DropdownMenuItem
                  key={item.value}
                  onSelect={() => onChange(item.value)}
                  className={cn(
                    item.value === value &&
                      "bg-primary/15 focus:bg-primary/20 focus:text-primary",
                  )}
                >
                  <span
                    className={cn(
                      "font-medium",
                      item.value === value && "text-primary",
                    )}
                  >
                    {item.label}
                  </span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>
    </div>
  );
}

/** Shared by the real tabs and by the probe, so the two measure the same. */
const tabClass =
  "flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm";

const triggerClass =
  "flex shrink-0 items-center gap-1 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm text-muted-foreground";

function Tab({
  item,
  selected,
  onSelect,
}: {
  item: TabItem;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      onClick={onSelect}
      className={cn(
        tabClass,
        "cursor-pointer transition-colors",
        selected
          ? // Soft, not solid: a tab is a place you are, not a button you press.
            "bg-primary/15 font-semibold text-primary"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {item.label}
    </button>
  );
}
