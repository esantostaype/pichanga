"use client";

import {
  Delete02Icon,
  LinkSquare02Icon,
  Location01Icon,
  PencilEdit02Icon,
  PlusSignIcon,
} from "@hugeicons/core-free-icons";
import { useState } from "react";

import { useLocale } from "@/components/providers/locale-provider";
import { usePichanga } from "@/components/providers/pichanga-provider";
import { BulkBar } from "@/components/ui/bulk-bar";
import { AppLink } from "@/components/ui/app-link";
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
import { fill } from "@/i18n/dictionaries";
import { useAction } from "@/hooks/use-action";
import { useRowSelection } from "@/hooks/use-row-selection";
import { formatMoney } from "@/lib/money";
import type { Venue } from "@/types";
import { VenueFormDialog } from "./venue-form-dialog";

export function VenuesDrawer({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useLocale();
  const { venues, isAdmin, deleteVenues } = usePichanga();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Venue | null>(null);
  /** Ids queued for deletion: one row or a whole selection, same path. */
  const [pendingDelete, setPendingDelete] = useState<string[]>([]);

  const selection = useRowSelection(venues);

  const remove = useAction(async (ids: string[]) => deleteVenues(ids), {
    success: t.venues.deletedMany,
    onSuccess: () => {
      setPendingDelete([]);
      selection.clear();
    },
  });

  const deleteLabel = (() => {
    if (pendingDelete.length !== 1) {
      return t.venues.deleteManyLine;
    }
    const one = venues.find((venue) => venue.id === pendingDelete[0]);
    return one ? t.venues.deleteOneLine : undefined;
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
            <SheetTitle>{t.venues.title}</SheetTitle>
            <SheetDescription>
              {fill(t.venues.savedCount, {
                count: venues.length,
                venues:
                  venues.length === 1 ? t.common.venue : t.common.venuesPlural,
              })}
            </SheetDescription>
          </SheetHeader>

          <SheetBody className="flex flex-col gap-4">
            {/* Anyone can read the venue list; only admins change it. */}
            {isAdmin ? (
              <Button size="sm" onClick={openCreate} className="self-start">
                <Icon icon={PlusSignIcon} size={16} />
                {t.venues.newVenue}
              </Button>
            ) : null}

            {venues.length === 0 ? (
              <EmptyState
                icon={Location01Icon}
                title={t.venues.emptyTitle}
                description={
                  isAdmin ? t.venues.emptyLineAdmin : t.venues.emptyLineGuest
                }
                action={
                  isAdmin ? (
                    <Button size="sm" onClick={openCreate}>
                      <Icon icon={PlusSignIcon} size={16} />
                      {t.venues.newVenue}
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
                      selection.count === 1
                        ? t.common.venue
                        : t.common.venuesPlural
                    }
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
                            aria-label={t.venues.selectAll}
                          />
                        </TableHead>
                      ) : null}
                      <TableHead className="w-px whitespace-nowrap">
                        {t.venues.name}
                      </TableHead>
                      <TableHead className="w-full">
                        {t.venues.address}
                      </TableHead>
                      <TableHead className="w-px whitespace-nowrap text-right">
                        {t.venues.price}
                      </TableHead>
                      {isAdmin ? (
                        <TableHead className="w-px text-right">
                          {t.common.actions}
                        </TableHead>
                      ) : null}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {venues.map((venue) => (
                      <TableRow
                        key={venue.id}
                        data-state={
                          selection.isSelected(venue.id)
                            ? "selected"
                            : undefined
                        }
                      >
                        {isAdmin ? (
                          <TableCell className="align-top">
                            <Checkbox
                              className="mt-1"
                              checked={selection.isSelected(venue.id)}
                              onCheckedChange={() => selection.toggle(venue.id)}
                              aria-label={fill(t.venues.selectName, {
                                name: venue.name,
                              })}
                            />
                          </TableCell>
                        ) : null}

                        <TableCell className="align-top whitespace-nowrap font-medium">
                          {venue.mapsUrl ? (
                            <AppLink
                              href={venue.mapsUrl}
                              external
                              trailingIcon={LinkSquare02Icon}
                              iconSize={13}
                              className="gap-1.5"
                            >
                              {venue.name}
                            </AppLink>
                          ) : (
                            venue.name
                          )}
                        </TableCell>

                        <TableCell className="align-top text-muted-foreground">
                          {venue.address ?? (
                            <span className="opacity-50">-</span>
                          )}
                        </TableCell>

                        <TableCell className="align-top whitespace-nowrap text-right tabular-nums text-muted-foreground">
                          {venue.price != null ? (
                            formatMoney(venue.price)
                          ) : (
                            <span className="opacity-50">-</span>
                          )}
                        </TableCell>

                        {isAdmin ? (
                          <TableCell className="align-top">
                            <div className="-mt-1.5 flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                aria-label={fill(t.venues.editName, {
                                  name: venue.name,
                                })}
                                onClick={() => {
                                  setEditing(venue);
                                  setFormOpen(true);
                                }}
                              >
                                <Icon icon={PencilEdit02Icon} size={15} />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                aria-label={fill(t.venues.deleteName, {
                                  name: venue.name,
                                })}
                                className="text-muted-foreground hover:text-destructive"
                                onClick={() => setPendingDelete([venue.id])}
                              >
                                <Icon icon={Delete02Icon} size={15} />
                              </Button>
                            </div>
                          </TableCell>
                        ) : null}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </>
            )}
          </SheetBody>
        </SheetContent>
      </Sheet>

      <VenueFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        venue={editing}
      />

      <ConfirmDialog
        open={pendingDelete.length > 0}
        onOpenChange={(next) => !next && setPendingDelete([])}
        title={
          pendingDelete.length > 1
            ? fill(t.venues.deleteMany, { count: pendingDelete.length })
            : t.venues.deleteOne
        }
        description={deleteLabel}
        pending={remove.pending}
        onConfirm={() => remove.run(pendingDelete)}
      />
    </>
  );
}
