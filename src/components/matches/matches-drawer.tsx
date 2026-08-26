"use client";

import {
  Calendar03Icon,
  Delete02Icon,
  Location01Icon,
  PencilEdit02Icon,
  PlusSignIcon,
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
import { formatShortDate, formatTime, relativeLabel } from "@/lib/date";
import { cn } from "@/lib/utils";
import type { MatchSummary } from "@/types";
import { MatchFormDialog } from "./match-form-dialog";

export function MatchesDrawer({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { matches, nextMatch, deleteMatch } = usePichanga();

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
            <Button size="sm" onClick={openCreate} className="self-start">
              <Icon icon={PlusSignIcon} size={16} />
              New match
            </Button>

            {matches.length === 0 ? (
              <EmptyState
                icon={Calendar03Icon}
                title="No matches yet"
                description="Create a date and start adding players to the pitch."
                action={
                  <Button size="sm" onClick={openCreate}>
                    <Icon icon={PlusSignIcon} size={16} />
                    New match
                  </Button>
                }
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Place</TableHead>
                    <TableHead className="w-24">Players</TableHead>
                    <TableHead className="w-24 text-right">Actions</TableHead>
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
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span
                              className="font-medium"
                              suppressHydrationWarning
                            >
                              {formatShortDate(match.playedAt)}
                            </span>
                            {isNext ? <Badge>On pitch</Badge> : null}
                          </div>
                          <p
                            className="mt-0.5 text-xs text-muted-foreground"
                            suppressHydrationWarning
                          >
                            {formatTime(match.playedAt)} -{" "}
                            {relativeLabel(match.playedAt)}
                          </p>
                        </TableCell>

                        <TableCell className="text-muted-foreground">
                          {match.location ? (
                            <span className="flex items-center gap-1.5">
                              <Icon icon={Location01Icon} size={14} />
                              {match.location}
                            </span>
                          ) : (
                            <span className="opacity-50">-</span>
                          )}
                        </TableCell>

                        <TableCell>
                          <span className="flex items-center gap-1.5 text-muted-foreground">
                            <Icon icon={UserGroupIcon} size={14} />
                            {match.playerCount}
                          </span>
                        </TableCell>

                        <TableCell>
                          <div className="flex justify-end gap-1">
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
            ? `The ${formatShortDate(pendingDelete.playedAt)} date and its lineup will be removed. Player profiles are kept.`
            : undefined
        }
        pending={remove.pending}
        onConfirm={() => pendingDelete && remove.run(pendingDelete)}
      />
    </>
  );
}
