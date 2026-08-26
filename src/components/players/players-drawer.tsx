"use client";

import {
  Delete02Icon,
  PencilEdit02Icon,
  Search01Icon,
  UserAdd01Icon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons";
import { useMemo, useState } from "react";

import { usePichanga } from "@/components/providers/pichanga-provider";
import { Button } from "@/components/ui/button";
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
import { getArea } from "@/lib/constants";
import { normalize } from "@/lib/utils";
import type { Player } from "@/types";
import { AreaBadge } from "./area-badge";
import { PlayerAvatar } from "./player-avatar";
import { PlayerFormDialog } from "./player-form-dialog";

export function PlayersDrawer({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { players, deletePlayer } = usePichanga();

  const [query, setQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Player | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Player | null>(null);

  const results = useMemo(() => {
    const needle = normalize(query.trim());
    if (!needle) return players;

    return players.filter((player) =>
      normalize(
        `${player.firstName} ${player.lastName} ${getArea(player.area).label}`,
      ).includes(needle),
    );
  }, [players, query]);

  const remove = useAction(async (player: Player) => deletePlayer(player.id), {
    success: "Player deleted",
    onSuccess: () => setPendingDelete(null),
  });

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
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Player</TableHead>
                    <TableHead>Area</TableHead>
                    <TableHead className="w-24 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((player) => (
                    <TableRow key={player.id}>
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
                            onClick={() => setPendingDelete(player)}
                          >
                            <Icon icon={Delete02Icon} size={15} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </SheetBody>
        </SheetContent>
      </Sheet>

      <PlayerFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        player={editing}
      />

      <ConfirmDialog
        open={!!pendingDelete}
        onOpenChange={(next) => !next && setPendingDelete(null)}
        title="Delete player"
        description={
          pendingDelete
            ? `${pendingDelete.firstName} ${pendingDelete.lastName} will also be dropped from every match they are signed up for.`
            : undefined
        }
        pending={remove.pending}
        onConfirm={() => pendingDelete && remove.run(pendingDelete)}
      />
    </>
  );
}
