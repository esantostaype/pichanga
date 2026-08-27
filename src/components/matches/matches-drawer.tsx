"use client";

import {
  Calendar03Icon,
  Delete02Icon,
  Location01Icon,
  PencilEdit02Icon,
  PlusSignIcon,
  RepeatIcon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons";
import { useState } from "react";

import { usePichanga } from "@/components/providers/pichanga-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import {
  formatShortDate,
  formatTimeRange,
  isLive,
  relativeLabel,
} from "@/lib/date";
import { cn } from "@/lib/utils";
import type { MatchSummary } from "@/types";
import { LiveBadge } from "./live-badge";
import { MatchFormDialog } from "./match-form-dialog";

export function MatchesDrawer({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { matches, nextMatch, isAdmin, deleteMatch } = usePichanga();
  const now = useNow();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<MatchSummary | null>(null);
  const [pendingDelete, setPendingDelete] = useState<MatchSummary | null>(null);

  const remove = useAction(async (match: MatchSummary) => deleteMatch(match.id), {
    success: "Match deleted",
    onSuccess: () => setPendingDelete(null),
  });

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
              <Table>
                <TableHeader>
                  <TableRow>
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
                    {isAdmin ? (
                      <TableHead className="w-px text-right">Actions</TableHead>
                    ) : null}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {matches.map((match) => {
                    const isNext = match.id === nextMatch?.id;

                    return (
                      <TableRow
                        key={match.id}
                        className={cn(isNext && "bg-primary/5")}
                      >
                        <TableCell className="whitespace-nowrap align-top">
                          {/*
                            The chip sits beside the date from md up; below that
                            the drawer is too narrow, so it drops to its own line
                            between the date and the time.
                          */}
                          <div className="flex flex-col items-start gap-1 md:flex-row md:items-center md:gap-2">
                            <p className="font-medium" suppressHydrationWarning>
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
                            suppressHydrationWarning
                          >
                            {formatTimeRange(match.playedAt, match.endsAt)}
                            {" - "}
                            {relativeLabel(match.playedAt)}
                          </p>
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
                        </TableCell>

                        {isAdmin ? (
                          <TableCell className="align-top">
                            {/*
                              The icon buttons are 32px tall against a 20px text
                              line, so without this nudge their centre sits 6px
                              below the date and place text.
                            */}
                            <div className="-mt-1.5 flex justify-end gap-1">
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
                                onClick={() => setPendingDelete(match)}
                              >
                                <Icon icon={Delete02Icon} size={15} />
                              </Button>
                            </div>
                          </TableCell>
                        ) : null}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </SheetBody>
        </SheetContent>
      </Sheet>

      <MatchFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        match={editing}
      />

      <ConfirmDialog
        open={!!pendingDelete}
        onOpenChange={(next) => !next && setPendingDelete(null)}
        title="Delete match"
        description={
          pendingDelete
            ? `The ${formatShortDate(pendingDelete.playedAt)} date and its lineup will be removed${pendingDelete.recurrence === "weekly" ? ", and the weekly fixture stops repeating" : ""}. Player profiles are kept.`
            : undefined
        }
        pending={remove.pending}
        onConfirm={() => pendingDelete && remove.run(pendingDelete)}
      />
    </>
  );
}
