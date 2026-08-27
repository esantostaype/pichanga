"use client";

import {
  Album02Icon,
  Calendar03Icon,
  Delete02Icon,
  Location01Icon,
  PencilEdit02Icon,
  PlusSignIcon,
  RepeatIcon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons";
import Link from "next/link";
import { useState } from "react";

import { usePichanga } from "@/components/providers/pichanga-provider";
import { Badge } from "@/components/ui/badge";
import { BulkBar } from "@/components/ui/bulk-bar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAction } from "@/hooks/use-action";
import { useNow } from "@/hooks/use-now";
import { useRowSelection } from "@/hooks/use-row-selection";
import {
  formatShortDate,
  formatTimeRange,
  isLive,
  matchSlug,
  relativeLabel,
} from "@/lib/date";
import { cn } from "@/lib/utils";
import type { MatchSummary } from "@/types";
import { useScene } from "@/components/layout/scene-transition";
import { GalleryDialog } from "./gallery-dialog";
import { LiveBadge } from "./live-badge";
import { MatchFormDialog } from "./match-form-dialog";

/**
 * The Date column: a link into that match, or plain text when it is the match
 * already on screen. A real `href` so the row can be opened in a new tab or
 * copied, and a handler so an ordinary click goes behind the scene cut instead
 * of leaving the old screen up while the server answers.
 */
function DateCell({
  href,
  onNavigate,
  children,
}: {
  href: string | null;
  onNavigate: () => void;
  children: React.ReactNode;
}) {
  const shape = "flex h-full flex-col px-4 py-3";

  if (!href) return <div className={shape}>{children}</div>;

  return (
    <Link
      href={href}
      onClick={(event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey) return;
        event.preventDefault();
        onNavigate();
      }}
      className={cn(
        shape,
        "cursor-pointer transition-colors hover:bg-accent/60",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/60",
      )}
    >
      {children}
    </Link>
  );
}

export function MatchesDrawer({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { matches, nextMatch, homeMatchId, isAdmin, deleteMatches } =
    usePichanga();
  const { go } = useScene();
  const now = useNow();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<MatchSummary | null>(null);
  /** Ids queued for deletion: one row or a whole selection, same path. */
  const [pendingDelete, setPendingDelete] = useState<string[]>([]);
  /** Whose gallery is open. Any match has one, not just the one on the pitch. */
  const [gallery, setGallery] = useState<MatchSummary | null>(null);

  const selection = useRowSelection(matches);

  const remove = useAction(async (ids: string[]) => deleteMatches(ids), {
    success: "Matches deleted",
    onSuccess: () => {
      setPendingDelete([]);
      selection.clear();
    },
  });

  const deleteLabel = (() => {
    if (pendingDelete.length !== 1) {
      return `${pendingDelete.length} dates and their lineups will be removed. Player profiles are kept.`;
    }
    const one = matches.find((match) => match.id === pendingDelete[0]);
    return one
      ? `The ${formatShortDate(one.playedAt)} date and its lineup will be removed${one.recurrence === "weekly" ? ", and the weekly fixture stops repeating" : ""}. Player profiles are kept.`
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
            <SheetTitle>Matches</SheetTitle>
            <SheetDescription>
              {matches.length} date{matches.length === 1 ? "" : "s"} created. The
              closest one owns the pitch.
            </SheetDescription>
          </SheetHeader>

          <SheetBody className="flex flex-col gap-4">
            {/* Anyone can read the fixture list; only admins change it. */}
            {isAdmin ? (
              <Button size="sm" onClick={openCreate} className="self-start">
                <Icon icon={PlusSignIcon} size={16} />
                New match
              </Button>
            ) : null}

            {matches.length === 0 ? (
              <EmptyState
                icon={Calendar03Icon}
                title="No matches yet"
                description={
                  isAdmin
                    ? "Create a date and start adding players to the pitch."
                    : "Signing in is needed to create the first date."
                }
                action={
                  isAdmin ? (
                    <Button size="sm" onClick={openCreate}>
                      <Icon icon={PlusSignIcon} size={16} />
                      New match
                    </Button>
                  ) : null
                }
              />
            ) : (
              <>
                {isAdmin ? (
                  <BulkBar
                    count={selection.count}
                    noun="match"
                    disabled={remove.pending}
                    onClear={selection.clear}
                    onDelete={() => setPendingDelete(selection.selected)}
                  />
                ) : null}

                <Table>
                <TableHeader>
                  <TableRow>
                    {isAdmin ? (
                      <TableHead className="w-px">
                        <Checkbox
                          checked={selection.headerState}
                          onCheckedChange={selection.toggleAll}
                          aria-label="Select every match"
                        />
                      </TableHead>
                    ) : null}
                    {/*
                      `w-px` shrinks a column to its content and `w-full` makes
                      Place absorb the leftover width, so the table stays
                      readable as the drawer narrows.
                    */}
                    <TableHead className="w-px whitespace-nowrap">Date</TableHead>
                    <TableHead className="w-full">Place</TableHead>
                    {/*
                      The word "Players" was the widest thing in this column and
                      forced the table to overflow. The icon carries the meaning
                      visually and the label stays for screen readers.
                    */}
                    <TableHead className="w-px">
                      <span className="flex justify-center">
                        <Icon icon={UserGroupIcon} size={14} />
                        <span className="sr-only">Players</span>
                      </span>
                    </TableHead>
                    <TableHead className="w-px text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {matches.map((match) => {
                    /*
                     * The match already on screen. Its row is plain text: a
                     * link to the page you are looking at would play the whole
                     * transition to arrive exactly where you started.
                     */
                    const isNext = match.id === nextMatch?.id;
                    const href =
                      match.id === homeMatchId
                        ? "/"
                        : `/match/${matchSlug(match.playedAt)}`;

                    return (
                      <TableRow
                        key={match.id}
                        className={cn(isNext && "bg-primary/5")}
                        data-state={
                          selection.isSelected(match.id) ? "selected" : undefined
                        }
                      >
                        {isAdmin ? (
                          <TableCell className="align-top">
                            <Checkbox
                              className="mt-1"
                              checked={selection.isSelected(match.id)}
                              onCheckedChange={() => selection.toggle(match.id)}
                              aria-label={`Select the ${formatShortDate(match.playedAt)} match`}
                            />
                          </TableCell>
                        ) : null}

                        {/*
                          The whole cell is the link into the match: its own
                          address for any other date, and the front page for
                          whichever one is currently on the pitch there.
                        */}
                        <TableCell className="h-px whitespace-nowrap p-0 align-top">
                          {/*
                            A real `href` so the row can be opened in a new tab
                            or copied, and a handler so an ordinary click goes
                            behind the scene cut instead of leaving the old
                            screen up while the server answers.
                          */}
                          <DateCell
                            href={isNext ? null : href}
                            onNavigate={() => {
                              onOpenChange(false);
                              go(href);
                            }}
                          >
                          {/*
                            The chip sits beside the date from md up; below that
                            the drawer is too narrow, so it drops to its own line
                            between the date and the time.
                          */}
                          <div className="flex flex-col items-start gap-1 md:flex-row md:items-center md:gap-2">
                            <p className="font-medium underline-offset-4 group-hover:underline">
                              {formatShortDate(match.playedAt)}
                            </p>
                            {now !== null &&
                            isLive(match.playedAt, match.endsAt, now) ? (
                              <LiveBadge />
                            ) : isNext ? (
                              <Badge>On pitch</Badge>
                            ) : null}
                            {match.recurrence === "weekly" ? (
                              <Badge variant="outline">
                                <Icon icon={RepeatIcon} size={11} />
                                Weekly
                              </Badge>
                            ) : null}
                          </div>

                          <p
                            className="mt-1 text-xs text-muted-foreground"
                          >
                            {formatTimeRange(match.playedAt, match.endsAt)}
                            {" - "}
                            {relativeLabel(match.playedAt)}
                          </p>
                          </DateCell>
                        </TableCell>

                        <TableCell className="align-top text-muted-foreground">
                          {match.place ? (
                            <span className="flex items-start gap-1.5">
                              <Icon
                                icon={Location01Icon}
                                size={14}
                                className="mt-0.5"
                              />
                              {match.place.mapsUrl ? (
                                <a
                                  href={match.place.mapsUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="min-w-0 underline-offset-4 hover:text-primary hover:underline"
                                >
                                  {match.place.name}
                                </a>
                              ) : (
                                <span className="min-w-0">
                                  {match.place.name}
                                </span>
                              )}
                            </span>
                          ) : (
                            <span className="opacity-50">-</span>
                          )}
                        </TableCell>

                        {/* Just a number, so the column shrinks to fit it. */}
                        <TableCell className="align-top text-center tabular-nums text-muted-foreground">
                          {match.playerCount}
                          {/* The rental split, once anybody has paid. */}
                          {match.paidCount > 0 ? (
                            <span className="block text-xs text-emerald-400/80">
                              {match.paidCount} paid
                            </span>
                          ) : null}
                        </TableCell>

                        <TableCell className="align-top">
                          {/*
                            The icon buttons are 32px tall against a 20px text
                            line, so without this nudge their centre sits 6px
                            below the date and place text.
                          */}
                          <div className="-mt-1.5 flex justify-end gap-1">
                            {/* The album is open to everyone, like adding players. */}
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label="Match gallery"
                              onClick={() => setGallery(match)}
                            >
                              <Icon icon={Album02Icon} size={15} />
                            </Button>

                            {isAdmin ? (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  aria-label="Edit match"
                                  onClick={() => {
                                    setEditing(match);
                                    setFormOpen(true);
                                  }}
                                >
                                  <Icon icon={PencilEdit02Icon} size={15} />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  aria-label="Delete match"
                                  className="text-muted-foreground hover:text-destructive"
                                  onClick={() => setPendingDelete([match.id])}
                                >
                                  <Icon icon={Delete02Icon} size={15} />
                                </Button>
                              </>
                            ) : null}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
                </Table>
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
      />

      <ConfirmDialog
        open={pendingDelete.length > 0}
        onOpenChange={(next) => !next && setPendingDelete([])}
        title={
          pendingDelete.length > 1
            ? `Delete ${pendingDelete.length} matches`
            : "Delete match"
        }
        description={deleteLabel}
        pending={remove.pending}
        onConfirm={() => remove.run(pendingDelete)}
      />
    </>
  );
}
