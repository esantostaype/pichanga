"use client";

import { Calendar03Icon, PlusSignIcon } from "@hugeicons/core-free-icons";
import { useEffect, useState } from "react";

import { useLocale } from "@/components/providers/locale-provider";
import { usePichanga } from "@/components/providers/pichanga-provider";
import { BulkBar } from "@/components/ui/bulk-bar";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Icon } from "@/components/ui/icon";
import { Pager } from "@/components/ui/pager";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useAction } from "@/hooks/use-action";
import { useNow } from "@/hooks/use-now";
import { useRowSelection } from "@/hooks/use-row-selection";
import { fill } from "@/i18n/dictionaries";
import { api } from "@/lib/api-client";
import { formatShortDate, matchSlug } from "@/lib/date";
import type { Match, MatchSummary } from "@/types";
import { useScene } from "@/components/layout/scene-transition";
import { GalleryDialog } from "./gallery-dialog";
import { MatchCard } from "./match-card";
import { MatchFormDialog } from "./match-form-dialog";
import { PaymentsDialog } from "./payments-dialog";

/** Enough to fill the drawer twice over without turning it into a scroll. */
const PER_PAGE = 12;

export function MatchesDrawer({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t, locale } = useLocale();
  const { matches, players, nextMatch, homeMatchId, isAdmin, deleteMatches } =
    usePichanga();
  const { go } = useScene();
  const now = useNow();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<MatchSummary | null>(null);
  /** Ids queued for deletion: one row or a whole selection, same path. */
  const [pendingDelete, setPendingDelete] = useState<string[]>([]);
  /** Whose gallery is open. Any match has one, not just the one on the pitch. */
  const [gallery, setGallery] = useState<MatchSummary | null>(null);
  /** Whose lineup is open, and the copy fetched for it. */
  const [lineupOf, setLineupOf] = useState<MatchSummary | null>(null);
  const [lineup, setLineup] = useState<Match | null>(null);
  /** Bumped after a payment, so the fetch above runs again. */
  const [lineupVersion, setLineupVersion] = useState(0);
  const [page, setPage] = useState(1);

  /*
   * A card only carries counts, so the lineup behind it is fetched when asked
   * for. The match on the pitch is already in the provider; every other date
   * is not, and loading them all up front would be a query per row.
   */
  useEffect(() => {
    if (!lineupOf) return;

    let cancelled = false;

    void api.matches
      .get(lineupOf.id)
      .then((full) => {
        if (!cancelled) setLineup(full);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [lineupOf, lineupVersion]);

  const selection = useRowSelection(matches);

  /*
   * Clamped on read rather than corrected in an effect: deleting the last card
   * on the last page would otherwise leave the drawer on a page that no longer
   * exists for a render.
   */
  const pages = Math.max(1, Math.ceil(matches.length / PER_PAGE));
  const current = Math.min(page, pages);
  const visible = matches.slice((current - 1) * PER_PAGE, current * PER_PAGE);

  const remove = useAction(async (ids: string[]) => deleteMatches(ids), {
    success: t.matches.deletedMany,
    onSuccess: () => {
      setPendingDelete([]);
      selection.clear();
    },
  });

  const deleteLabel = (() => {
    if (pendingDelete.length !== 1) {
      return fill(t.matches.deleteManyLine, { count: pendingDelete.length });
    }
    const one = matches.find((match) => match.id === pendingDelete[0]);
    return one
      ? fill(t.matches.deleteOneLine, {
          date: formatShortDate(one.playedAt, locale),
          weekly: one.recurrence === "weekly" ? t.matches.deleteWeekly : "",
        })
      : undefined;
  })();

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{t.matches.title}</SheetTitle>
            <SheetDescription>
              {fill(t.matches.datesCreated, {
                count: matches.length,
                dates: matches.length === 1 ? t.common.date : t.common.dates,
              })}
            </SheetDescription>
          </SheetHeader>

          <SheetBody className="flex flex-col gap-4">
            {/* Anyone can read the fixture list; only admins change it. */}
            {isAdmin ? (
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" onClick={openCreate}>
                  <Icon icon={PlusSignIcon} size={16} />
                  {t.matches.newMatch}
                </Button>

                {matches.length > 0 ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={selection.toggleAll}
                  >
                    {selection.count === matches.length
                      ? t.matches.clearAll
                      : t.matches.selectAll}
                  </Button>
                ) : null}
              </div>
            ) : null}

            {matches.length === 0 ? (
              <EmptyState
                icon={Calendar03Icon}
                title={t.matches.emptyTitle}
                description={
                  isAdmin ? t.matches.emptyLine : t.matches.emptyGuest
                }
                action={
                  isAdmin ? (
                    <Button size="sm" onClick={openCreate}>
                      <Icon icon={PlusSignIcon} size={16} />
                      {t.matches.newMatch}
                    </Button>
                  ) : null
                }
              />
            ) : (
              <>
                {isAdmin ? (
                  <BulkBar
                    count={selection.count}
                    noun={
                      selection.count === 1 ? t.common.date : t.common.dates
                    }
                    disabled={remove.pending}
                    onClear={selection.clear}
                    onDelete={() => setPendingDelete(selection.selected)}
                  />
                ) : null}

                {/* Two to a row where there is room, one on a phone. */}
                <div className="grid gap-3 sm:grid-cols-2">
                  {visible.map((match) => {
                    /*
                     * The match already on screen. Its card is not a link: the
                     * whole transition to arrive where you started is worse
                     * than a card that stays put.
                     */
                    const isNext = match.id === nextMatch?.id;
                    const href =
                      match.id === homeMatchId
                        ? "/"
                        : `/match/${matchSlug(match.playedAt)}`;

                    /*
                     * Kicked off already, live or long finished. A played
                     * fixture is a record: the date, the venue and the album
                     * stop being editable, and what is in them stays readable.
                     */
                    const started = now !== null && match.playedAt <= now;

                    const organizer = players.find(
                      (player) => player.id === match.organizerId,
                    );

                    return (
                      <MatchCard
                        key={match.id}
                        match={match}
                        href={isNext ? null : href}
                        onNavigate={() => {
                          onOpenChange(false);
                          go(href);
                        }}
                        isNext={isNext}
                        now={now}
                        organizer={
                          organizer
                            ? `${organizer.firstName} ${organizer.lastName}`
                            : undefined
                        }
                        selected={
                          isAdmin ? selection.isSelected(match.id) : undefined
                        }
                        onSelect={
                          isAdmin ? () => selection.toggle(match.id) : undefined
                        }
                        onLineup={() => {
                          setLineup(null);
                          setLineupOf(match);
                        }}
                        onGallery={() => setGallery(match)}
                        onEdit={
                          isAdmin && !started
                            ? () => {
                                setEditing(match);
                                setFormOpen(true);
                              }
                            : undefined
                        }
                        onDelete={
                          isAdmin && !started
                            ? () => setPendingDelete([match.id])
                            : undefined
                        }
                      />
                    );
                  })}
                </div>

                <Pager page={current} pages={pages} onChange={setPage} />
              </>
            )}
          </SheetBody>
        </SheetContent>
      </Sheet>

      <MatchFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        match={editing}
      />

      <GalleryDialog
        open={!!gallery}
        onOpenChange={(next) => !next && setGallery(null)}
        matchId={gallery?.id ?? null}
        playedAt={gallery?.playedAt ?? null}
        // Closed to new files once the match has started, like the fixture.
        canAdd={!!gallery && now !== null && gallery.playedAt > now}
      />

      <PaymentsDialog
        open={!!lineupOf}
        onOpenChange={(next) => {
          if (!next) {
            setLineupOf(null);
            setLineup(null);
          }
        }}
        match={lineup}
        loading={!!lineupOf && !lineup}
        onToggled={() => setLineupVersion((version) => version + 1)}
      />

      <ConfirmDialog
        open={pendingDelete.length > 0}
        onOpenChange={(next) => !next && setPendingDelete([])}
        title={
          pendingDelete.length > 1
            ? fill(t.matches.deleteMany, { count: pendingDelete.length })
            : t.matches.deleteOne
        }
        description={deleteLabel}
        pending={remove.pending}
        onConfirm={() => remove.run(pendingDelete)}
      />
    </>
  );
}
