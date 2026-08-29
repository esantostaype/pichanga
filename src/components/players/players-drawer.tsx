"use client";

import {
  Delete02Icon,
  PencilEdit02Icon,
  Search01Icon,
  UserAdd01Icon,
  UserGroupIcon,
  ViewIcon,
} from "@hugeicons/core-free-icons";
import { useMemo, useState } from "react";

import { usePichanga } from "@/components/providers/pichanga-provider";
import { BulkBar } from "@/components/ui/bulk-bar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
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
import { useRowSelection } from "@/hooks/use-row-selection";
import { getArea } from "@/lib/constants";
import { normalize } from "@/lib/utils";
import type { Player } from "@/types";
import { AreaBadge } from "./area-badge";
import { PlayerAvatar } from "./player-avatar";
import { PlayerCardDialog } from "./player-card-dialog";
import { PlayerFormDialog } from "./player-form-dialog";

export function PlayersDrawer({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { players, deletePlayers } = usePichanga();

  const [query, setQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Player | null>(null);
  /** Whose card is open. Reading a profile is not editing one. */
  const [viewing, setViewing] = useState<Player | null>(null);
  /** Ids queued for deletion: one row or a whole selection, same path. */
  const [pendingDelete, setPendingDelete] = useState<string[]>([]);

  const results = useMemo(() => {
    const needle = normalize(query.trim());
    if (!needle) return players;

    return players.filter((player) =>
      normalize(
        `${player.firstName} ${player.lastName} ${getArea(player.area).label}`,
      ).includes(needle),
    );
  }, [players, query]);

  // Selection follows the filtered rows, so "select all" means what is on
  // screen rather than every player in the database.
  const selection = useRowSelection(results);

  const remove = useAction(async (ids: string[]) => deletePlayers(ids), {
    success: "Players deleted",
    onSuccess: () => {
      setPendingDelete([]);
      selection.clear();
    },
  });

  const deleteLabel = (() => {
    if (pendingDelete.length !== 1) {
      return `${pendingDelete.length} players will be removed, and they will leave every match they are signed up for.`;
    }
    const one = players.find((player) => player.id === pendingDelete[0]);
    return one
      ? `${one.firstName} ${one.lastName} will also be dropped from every match they are signed up for.`
      : undefined;
  })();

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (player: Player) => {
    setEditing(player);
    setFormOpen(true);
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Players</SheetTitle>
            <SheetDescription>
              {players.length} profile{players.length === 1 ? "" : "s"} saved.
            </SheetDescription>
          </SheetHeader>

          <SheetBody className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Button size="sm" onClick={openCreate} className="self-start">
                <Icon icon={UserAdd01Icon} size={16} />
                New player
              </Button>

              <div className="relative sm:w-64">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  <Icon icon={Search01Icon} size={16} />
                </span>
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search players..."
                  className="h-9 pl-9"
                />
              </div>
            </div>

            {results.length === 0 ? (
              <EmptyState
                icon={UserGroupIcon}
                title={players.length ? "No results" : "No players yet"}
                description={
                  players.length
                    ? "Try another name or area."
                    : "Create the first profile to start building matches."
                }
                action={
                  players.length ? null : (
                    <Button size="sm" onClick={openCreate}>
                      <Icon icon={UserAdd01Icon} size={16} />
                      New player
                    </Button>
                  )
                }
              />
            ) : (
              <>
                <BulkBar
                  count={selection.count}
                  noun="player"
                  disabled={remove.pending}
                  onClear={selection.clear}
                  onDelete={() => setPendingDelete(selection.selected)}
                />

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-px">
                        <Checkbox
                          checked={selection.headerState}
                          onCheckedChange={selection.toggleAll}
                          aria-label="Select every player shown"
                        />
                      </TableHead>
                      <TableHead>Player</TableHead>
                      <TableHead>Area</TableHead>
                      <TableHead className="w-24 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results.map((player) => (
                      <TableRow
                        key={player.id}
                        data-state={
                          selection.isSelected(player.id) ? "selected" : undefined
                        }
                      >
                        <TableCell className="align-top">
                          <Checkbox
                            className="mt-2.5"
                            checked={selection.isSelected(player.id)}
                            onCheckedChange={() => selection.toggle(player.id)}
                            aria-label={`Select ${player.firstName} ${player.lastName}`}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <PlayerAvatar player={player} className="size-9" />
                            <span className="min-w-0">
                              <span className="block truncate font-medium">
                                {player.firstName} {player.lastName}
                              </span>
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <AreaBadge area={player.area} />
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label={`View ${player.firstName}`}
                              onClick={() => setViewing(player)}
                            >
                              <Icon icon={ViewIcon} size={15} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label={`Edit ${player.firstName}`}
                              onClick={() => openEdit(player)}
                            >
                              <Icon icon={PencilEdit02Icon} size={15} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label={`Delete ${player.firstName}`}
                              className="text-muted-foreground hover:text-destructive"
                              onClick={() => setPendingDelete([player.id])}
                            >
                              <Icon icon={Delete02Icon} size={15} />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </>
            )}
          </SheetBody>
        </SheetContent>
      </Sheet>

      <PlayerCardDialog
        open={!!viewing}
        onOpenChange={(next) => !next && setViewing(null)}
        player={viewing}
      />

      <PlayerFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        player={editing}
      />

      <ConfirmDialog
        open={pendingDelete.length > 0}
        onOpenChange={(next) => !next && setPendingDelete([])}
        title={
          pendingDelete.length > 1
            ? `Delete ${pendingDelete.length} players`
            : "Delete player"
        }
        description={deleteLabel}
        pending={remove.pending}
        onConfirm={() => remove.run(pendingDelete)}
      />
    </>
  );
}
