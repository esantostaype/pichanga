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

import { useLocale } from "@/components/providers/locale-provider";
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
import { areaLabel, fill } from "@/i18n/dictionaries";
import { useAction } from "@/hooks/use-action";
import { useRowSelection } from "@/hooks/use-row-selection";
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
  const { t } = useLocale();
  const { players, deletePlayers } = usePichanga();

  const [query, setQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Player | null>(null);
  /** Whose card is open. Reading a profile is not editing one. */
  /* Kept after closing, so the card has something to animate out. */
  const [viewing, setViewing] = useState<Player | null>(null);
  const [cardOpen, setCardOpen] = useState(false);
  /** Ids queued for deletion: one row or a whole selection, same path. */
  const [pendingDelete, setPendingDelete] = useState<string[]>([]);

  const results = useMemo(() => {
    const needle = normalize(query.trim());
    if (!needle) return players;

    return players.filter((player) =>
      normalize(
        `${player.firstName} ${player.lastName} ${areaLabel(player.area)}`,
      ).includes(needle),
    );
  }, [players, query]);

  // Selection follows the filtered rows, so "select all" means what is on
  // screen rather than every player in the database.
  const selection = useRowSelection(results);

  const remove = useAction(async (ids: string[]) => deletePlayers(ids), {
    success: t.players.deletedMany,
    onSuccess: () => {
      setPendingDelete([]);
      selection.clear();
    },
  });

  const deleteLabel = (() => {
    if (pendingDelete.length !== 1) {
      return fill(t.players.deleteManyLine, { count: pendingDelete.length });
    }
    const one = players.find((player) => player.id === pendingDelete[0]);
    return one
      ? fill(t.players.deleteOneLine, {
          name: `${one.firstName} ${one.lastName}`,
        })
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
            <SheetTitle>{t.players.title}</SheetTitle>
            <SheetDescription>
              {fill(t.players.savedCount, {
                count: players.length,
                profiles:
                  players.length === 1 ? t.players.profile : t.players.profiles,
              })}
            </SheetDescription>
          </SheetHeader>

          <SheetBody className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Button size="sm" onClick={openCreate} className="self-start">
                <Icon icon={UserAdd01Icon} size={16} />
                {t.players.newPlayer}
              </Button>

              <div className="relative sm:w-64">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  <Icon icon={Search01Icon} size={16} />
                </span>
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={t.players.searchPlaceholder}
                  className="h-9 pl-9"
                />
              </div>
            </div>

            {results.length === 0 ? (
              <EmptyState
                icon={UserGroupIcon}
                title={
                  players.length ? t.players.noResults : t.players.emptyTitle
                }
                description={
                  players.length ? t.players.tryAnother : t.players.noneYet
                }
                action={
                  players.length ? null : (
                    <Button size="sm" onClick={openCreate}>
                      <Icon icon={UserAdd01Icon} size={16} />
                      {t.players.newPlayer}
                    </Button>
                  )
                }
              />
            ) : (
              <>
                <BulkBar
                  count={selection.count}
                  noun={
                    selection.count === 1 ? t.common.player : t.common.players
                  }
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
                          aria-label={t.players.selectAllShown}
                        />
                      </TableHead>
                      <TableHead>{t.stats.player}</TableHead>
                      <TableHead>{t.players.area}</TableHead>
                      <TableHead className="w-24 text-right">
                        {t.common.actions}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results.map((player) => (
                      <TableRow
                        key={player.id}
                        data-state={
                          selection.isSelected(player.id)
                            ? "selected"
                            : undefined
                        }
                      >
                        <TableCell className="align-top">
                          <Checkbox
                            className="mt-2.5"
                            checked={selection.isSelected(player.id)}
                            onCheckedChange={() => selection.toggle(player.id)}
                            aria-label={fill(t.players.select, {
                              name: `${player.firstName} ${player.lastName}`,
                            })}
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
                              aria-label={fill(t.players.viewName, {
                                name: player.firstName,
                              })}
                              onClick={() => {
                                setViewing(player);
                                setCardOpen(true);
                              }}
                            >
                              <Icon icon={ViewIcon} size={15} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label={fill(t.players.editName, {
                                name: player.firstName,
                              })}
                              onClick={() => openEdit(player)}
                            >
                              <Icon icon={PencilEdit02Icon} size={15} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label={fill(t.players.deleteName, {
                                name: player.firstName,
                              })}
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
        open={cardOpen}
        onOpenChange={setCardOpen}
        player={viewing}
        onEdit={(player) => {
          setCardOpen(false);
          setEditing(player);
          setFormOpen(true);
        }}
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
            ? fill(t.players.deleteMany, { count: pendingDelete.length })
            : t.players.deleteOne
        }
        description={deleteLabel}
        pending={remove.pending}
        onConfirm={() => remove.run(pendingDelete)}
      />
    </>
  );
}
