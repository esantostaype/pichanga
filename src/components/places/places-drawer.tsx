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
import type { Place } from "@/types";
import { PlaceFormDialog } from "./place-form-dialog";

export function PlacesDrawer({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useLocale();
  const { places, isAdmin, deletePlaces } = usePichanga();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Place | null>(null);
  /** Ids queued for deletion: one row or a whole selection, same path. */
  const [pendingDelete, setPendingDelete] = useState<string[]>([]);

  const selection = useRowSelection(places);

  const remove = useAction(async (ids: string[]) => deletePlaces(ids), {
    success: t.places.deletedMany,
    onSuccess: () => {
      setPendingDelete([]);
      selection.clear();
    },
  });

  const deleteLabel = (() => {
    if (pendingDelete.length !== 1) {
      return t.places.deleteManyLine;
    }
    const one = places.find((place) => place.id === pendingDelete[0]);
    return one ? t.places.deleteOneLine : undefined;
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
            <SheetTitle>{t.places.title}</SheetTitle>
            <SheetDescription>
              {fill(t.places.savedCount, {
                count: places.length,
                places:
                  places.length === 1 ? t.common.place : t.common.placesPlural,
              })}
            </SheetDescription>
          </SheetHeader>

          <SheetBody className="flex flex-col gap-4">
            {/* Anyone can read the venue list; only admins change it. */}
            {isAdmin ? (
              <Button size="sm" onClick={openCreate} className="self-start">
                <Icon icon={PlusSignIcon} size={16} />
                {t.places.newPlace}
              </Button>
            ) : null}

            {places.length === 0 ? (
              <EmptyState
                icon={Location01Icon}
                title={t.places.emptyTitle}
                description={
                  isAdmin ? t.places.emptyLineAdmin : t.places.emptyLineGuest
                }
                action={
                  isAdmin ? (
                    <Button size="sm" onClick={openCreate}>
                      <Icon icon={PlusSignIcon} size={16} />
                      {t.places.newPlace}
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
                        ? t.common.place
                        : t.common.placesPlural
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
                            aria-label={t.places.selectAll}
                          />
                        </TableHead>
                      ) : null}
                      <TableHead className="w-px whitespace-nowrap">
                        {t.places.name}
                      </TableHead>
                      <TableHead className="w-full">
                        {t.places.address}
                      </TableHead>
                      <TableHead className="w-px whitespace-nowrap text-right">
                        {t.places.price}
                      </TableHead>
                      {isAdmin ? (
                        <TableHead className="w-px text-right">
                          {t.common.actions}
                        </TableHead>
                      ) : null}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {places.map((place) => (
                      <TableRow
                        key={place.id}
                        data-state={
                          selection.isSelected(place.id)
                            ? "selected"
                            : undefined
                        }
                      >
                        {isAdmin ? (
                          <TableCell className="align-top">
                            <Checkbox
                              className="mt-1"
                              checked={selection.isSelected(place.id)}
                              onCheckedChange={() => selection.toggle(place.id)}
                              aria-label={fill(t.places.selectName, {
                                name: place.name,
                              })}
                            />
                          </TableCell>
                        ) : null}

                        <TableCell className="align-top whitespace-nowrap font-medium">
                          {place.mapsUrl ? (
                            <AppLink
                              href={place.mapsUrl}
                              external
                              trailingIcon={LinkSquare02Icon}
                              iconSize={13}
                              className="gap-1.5"
                            >
                              {place.name}
                            </AppLink>
                          ) : (
                            place.name
                          )}
                        </TableCell>

                        <TableCell className="align-top text-muted-foreground">
                          {place.address ?? (
                            <span className="opacity-50">-</span>
                          )}
                        </TableCell>

                        <TableCell className="align-top whitespace-nowrap text-right tabular-nums text-muted-foreground">
                          {place.price != null ? (
                            formatMoney(place.price)
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
                                aria-label={fill(t.places.editName, {
                                  name: place.name,
                                })}
                                onClick={() => {
                                  setEditing(place);
                                  setFormOpen(true);
                                }}
                              >
                                <Icon icon={PencilEdit02Icon} size={15} />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                aria-label={fill(t.places.deleteName, {
                                  name: place.name,
                                })}
                                className="text-muted-foreground hover:text-destructive"
                                onClick={() => setPendingDelete([place.id])}
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

      <PlaceFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        place={editing}
      />

      <ConfirmDialog
        open={pendingDelete.length > 0}
        onOpenChange={(next) => !next && setPendingDelete([])}
        title={
          pendingDelete.length > 1
            ? fill(t.places.deleteMany, { count: pendingDelete.length })
            : t.places.deleteOne
        }
        description={deleteLabel}
        pending={remove.pending}
        onConfirm={() => remove.run(pendingDelete)}
      />
    </>
  );
}
