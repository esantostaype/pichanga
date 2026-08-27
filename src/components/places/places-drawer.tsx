"use client";

import {
  Delete02Icon,
  LinkSquare02Icon,
  Location01Icon,
  PencilEdit02Icon,
  PlusSignIcon,
} from "@hugeicons/core-free-icons";
import { useState } from "react";

import { usePichanga } from "@/components/providers/pichanga-provider";
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
import { useRowSelection } from "@/hooks/use-row-selection";
import type { Place } from "@/types";
import { PlaceFormDialog } from "./place-form-dialog";

export function PlacesDrawer({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { places, isAdmin, deletePlaces } = usePichanga();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Place | null>(null);
  /** Ids queued for deletion: one row or a whole selection, same path. */
  const [pendingDelete, setPendingDelete] = useState<string[]>([]);

  const selection = useRowSelection(places);

  const remove = useAction(async (ids: string[]) => deletePlaces(ids), {
    success: "Places deleted",
    onSuccess: () => {
      setPendingDelete([]);
      selection.clear();
    },
  });

  const deleteLabel = (() => {
    if (pendingDelete.length !== 1) {
      return `${pendingDelete.length} venues will be removed. Matches played there are kept, just without a venue.`;
    }
    const one = places.find((place) => place.id === pendingDelete[0]);
    return one
      ? `${one.name} will be removed. Matches played there are kept, just without a venue.`
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
            <SheetTitle>Places</SheetTitle>
            <SheetDescription>
              {places.length} venue{places.length === 1 ? "" : "s"} saved.
            </SheetDescription>
          </SheetHeader>

          <SheetBody className="flex flex-col gap-4">
            {/* Anyone can read the venue list; only admins change it. */}
            {isAdmin ? (
              <Button size="sm" onClick={openCreate} className="self-start">
                <Icon icon={PlusSignIcon} size={16} />
                New place
              </Button>
            ) : null}

            {places.length === 0 ? (
              <EmptyState
                icon={Location01Icon}
                title="No places yet"
                description={
                  isAdmin
                    ? "Save the pitches you usually play at."
                    : "Signing in is needed to save a pitch."
                }
                action={
                  isAdmin ? (
                    <Button size="sm" onClick={openCreate}>
                      <Icon icon={PlusSignIcon} size={16} />
                      New place
                    </Button>
                  ) : null
                }
              />
            ) : (
              <>
                {isAdmin ? (
                  <BulkBar
                    count={selection.count}
                    noun="place"
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
                          aria-label="Select every place"
                        />
                      </TableHead>
                    ) : null}
                    <TableHead className="w-px whitespace-nowrap">
                      Place
                    </TableHead>
                    <TableHead className="w-full">Address</TableHead>
                    {isAdmin ? (
                      <TableHead className="w-px text-right">Actions</TableHead>
                    ) : null}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {places.map((place) => (
                    <TableRow
                      key={place.id}
                      data-state={
                        selection.isSelected(place.id) ? "selected" : undefined
                      }
                    >
                      {isAdmin ? (
                        <TableCell className="align-top">
                          <Checkbox
                            className="mt-1"
                            checked={selection.isSelected(place.id)}
                            onCheckedChange={() => selection.toggle(place.id)}
                            aria-label={`Select ${place.name}`}
                          />
                        </TableCell>
                      ) : null}

                      <TableCell className="align-top whitespace-nowrap font-medium">
                        {place.mapsUrl ? (
                          <a
                            href={place.mapsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 underline-offset-4 hover:text-primary hover:underline"
                          >
                            {place.name}
                            <Icon icon={LinkSquare02Icon} size={13} />
                          </a>
                        ) : (
                          place.name
                        )}
                      </TableCell>

                      <TableCell className="align-top text-muted-foreground">
                        {place.address ?? <span className="opacity-50">-</span>}
                      </TableCell>

                      {isAdmin ? (
                        <TableCell className="align-top">
                          <div className="-mt-1.5 flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label={`Edit ${place.name}`}
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
                              aria-label={`Delete ${place.name}`}
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
            ? `Delete ${pendingDelete.length} places`
            : "Delete place"
        }
        description={deleteLabel}
        pending={remove.pending}
        onConfirm={() => remove.run(pendingDelete)}
      />
    </>
  );
}
