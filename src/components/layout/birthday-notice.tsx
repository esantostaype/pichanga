"use client";

import { BirthdayCakeIcon } from "@hugeicons/core-free-icons";

import { useLocale } from "@/components/providers/locale-provider";
import { usePichanga } from "@/components/providers/pichanga-provider";
import { Icon } from "@/components/ui/icon";
import { useNow } from "@/hooks/use-now";
import { fill } from "@/i18n/dictionaries";
import { birthdaysAhead, todayInput } from "@/lib/age";
import { BIRTHDAY_NOTICE_DAYS } from "@/lib/constants";

/**
 * Somebody's birthday is coming up: a pill under the header saying whose and
 * when, that opens the full list.
 *
 * Only inside the week (`BIRTHDAY_NOTICE_DAYS`), and nothing at all the rest of
 * the time -- a notice that is always there is a notice nobody reads. Waits for
 * the clock rather than reading it during render, so the server and the
 * browser never disagree about which day it is.
 */
export function BirthdayNotice({ onOpen }: { onOpen: () => void }) {
  const { t } = useLocale();
  const { players } = usePichanga();
  const now = useNow(60_000);

  if (now === null) return null;

  const soon = birthdaysAhead(players, todayInput(now), BIRTHDAY_NOTICE_DAYS);
  if (!soon.length) return null;

  const [first, ...rest] = soon;
  const name = first.person.firstName;
  const days = first.next.days;

  const line =
    days === 0
      ? fill(t.birthdays.noticeToday, { name })
      : fill(t.birthdays.noticeSoon, {
          name,
          when:
            days === 1
              ? t.birthdays.tomorrow.toLowerCase()
              : fill(t.birthdays.noticeSoonWhen, { days }),
        });

  return (
    <button
      type="button"
      onClick={onOpen}
      className="pointer-events-auto inline-flex max-w-full items-center gap-2 self-start rounded-full border border-primary/40 bg-black/65 px-3 py-1.5 text-sm text-foreground backdrop-blur-md transition-colors hover:bg-black/80"
    >
      <Icon
        icon={BirthdayCakeIcon}
        size={16}
        className="shrink-0 text-primary"
      />
      <span className="truncate">
        {line}
        {rest.length
          ? ` ${fill(t.birthdays.noticeMore, { count: rest.length })}`
          : null}
      </span>
    </button>
  );
}
