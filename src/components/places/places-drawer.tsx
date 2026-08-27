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
import type { Place } from "@/types";
import { PlaceFormDialog } from "./place-form-dialog";

export function PlacesDrawer({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { places, isAdmin, deletePlace } = usePichanga();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Place | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Place | null>(null);

  const remove = useAction(async (place: Place) => deletePlace(place.id), {
    success: "Place deleted",
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
              <Table>
                <TableHeader>
                  <TableRow>
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
                    <TableRow key={place.id}>
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
                              onClick={() => setPendingDelete(place)}
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
        open={!!pendingDelete}
        onOpenChange={(next) => !next && setPendingDelete(null)}
        title="Delete place"
        description={
          pendingDelete
            ? `${pendingDelete.name} will be removed. Matches played there are kept, just without a venue.`
            : undefined
        }
        pending={remove.pending}
        onConfirm={() => pendingDelete && remove.run(pendingDelete)}
      />
    </>
  );
}
