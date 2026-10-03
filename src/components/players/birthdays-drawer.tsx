"use client";

import { BirthdayCakeIcon } from "@hugeicons/core-free-icons";

import { useLocale } from "@/components/providers/locale-provider";
import { usePichanga } from "@/components/providers/pichanga-provider";
import { EmptyState } from "@/components/ui/empty-state";
import { Icon } from "@/components/ui/icon";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useNow } from "@/hooks/use-now";
import { fill, type Dictionary } from "@/i18n/dictionaries";
import {
  birthdaysAhead,
  formatBirthday,
  todayInput,
  type NextBirthday,
} from "@/lib/age";
import { BIRTHDAY_NOTICE_DAYS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { Player } from "@/types";
import { CategoryBadge } from "./category-badge";
import { PlayerAvatar } from "./player-avatar";

/** "Today!", "Tomorrow" or "In 12 days". */
export function whenLabel(t: Dictionary, days: number) {
  if (days === 0) return t.birthdays.today;
  if (days === 1) return t.birthdays.tomorrow;
  return fill(t.birthdays.inDays, { days });
}

/**
 * Everybody's birthday, the next one first.
 *
 * Read off the squad the provider already holds, so it is the same world the
 * screen is in -- the sandbox's birthdays on `/demo`, the real ones elsewhere.
 * Split in two: the week the notice up top is talking about, and the rest of
 * the year.
 */
export function BirthdaysDrawer({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t, locale } = useLocale();
  const { players } = usePichanga();
  const now = useNow(60_000);

  // The clock is null for the first render only; the sheet is shut by then.
  const ahead = now === null ? [] : birthdaysAhead(players, todayInput(now));
  const soon = ahead.filter((entry) => entry.next.days <= BIRTHDAY_NOTICE_DAYS);
  const later = ahead.filter((entry) => entry.next.days > BIRTHDAY_NOTICE_DAYS);
  const missing = players.length - ahead.length;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{t.birthdays.title}</SheetTitle>
          <SheetDescription>
            {fill(t.birthdays.summary, { count: ahead.length })}
            {missing > 0
              ? ` ${fill(t.birthdays.missing, { count: missing })}.`
              : null}
          </SheetDescription>
        </SheetHeader>

        <SheetBody className="flex flex-col gap-5">
          {ahead.length === 0 ? (
            <EmptyState
              icon={BirthdayCakeIcon}
              title={t.birthdays.emptyTitle}
              description={t.birthdays.emptyLine}
            />
          ) : (
            <>
              {soon.length > 0 ? (
                <Group title={t.birthdays.thisWeek}>
                  {soon.map(({ person, next }) => (
                    <Row
                      key={person.id}
                      player={person}
                      next={next}
                      highlight
                      locale={locale}
                    />
                  ))}
                </Group>
              ) : null}

              {later.length > 0 ? (
                <Group title={t.birthdays.later}>
                  {later.map(({ person, next }) => (
                    <Row
                      key={person.id}
                      player={person}
                      next={next}
                      locale={locale}
                    />
                  ))}
                </Group>
              ) : null}
            </>
          )}
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}

function Group({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="font-display text-xs uppercase tracking-[0.2em] text-muted-foreground">
        {title}
      </h3>
      <ul className="flex flex-col gap-2">{children}</ul>
    </section>
  );
}

function Row({
  player,
  next,
  highlight,
  locale,
}: {
  player: Player;
  next: NextBirthday;
  highlight?: boolean;
  locale: "en" | "es";
}) {
  const { t } = useLocale();

  return (
    <li
      className={cn(
        "flex items-center gap-3 rounded-2xl border px-3 py-2.5",
        highlight
          ? "border-primary/40 bg-primary/10"
          : "border-border/60 bg-muted/20",
      )}
    >
      <PlayerAvatar player={player} className="size-10 shrink-0" />

      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">
          {player.firstName} {player.lastName}
        </span>
        <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          <span className="capitalize">
            {formatBirthday(next.date, locale, false)}
          </span>
          <CategoryBadge birthDate={player.birthDate} />
        </span>
      </span>

      <span className="shrink-0 text-right">
        <span
          className={cn(
            "flex items-center justify-end gap-1 font-display text-sm uppercase tracking-[0.08em]",
            highlight ? "text-primary" : "text-foreground",
          )}
        >
          {next.days === 0 ? <Icon icon={BirthdayCakeIcon} size={15} /> : null}
          {whenLabel(t, next.days)}
        </span>
        <span className="block text-xs text-muted-foreground">
          {fill(t.birthdays.turns, { age: next.turning })}
        </span>
      </span>
    </li>
  );
}
