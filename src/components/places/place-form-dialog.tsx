"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRef } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { usePichanga } from "@/components/providers/pichanga-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useAction } from "@/hooks/use-action";
import type { Place } from "@/types";
import { PlaceSearchField } from "./place-search-field";

const formSchema = z.object({
  name: z.string().trim().min(2, "At least 2 characters").max(80),
  address: z.string().trim().max(200).optional(),
  mapsUrl: z
    .union([z.string().url("Must be a valid URL"), z.literal("")])
    .optional(),
});

type FormValues = z.infer<typeof formSchema>;

type PlaceFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  place?: Place | null;
  onSaved?: (place: Place) => void;
};

export function PlaceFormDialog({
  open,
  onOpenChange,
  place,
  onSaved,
}: PlaceFormDialogProps) {
  const busy = useRef(false);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!busy.current) onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{place ? "Edit place" : "New place"}</DialogTitle>
          <DialogDescription>
            Search it on Google Maps to fill everything in, or type it by hand.
          </DialogDescription>
        </DialogHeader>

        <PlaceForm
          place={place ?? null}
          onBusyChange={(value) => (busy.current = value)}
          onDone={(saved) => {
            if (saved) onSaved?.(saved);
            onOpenChange(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

function PlaceForm({
  place,
  onBusyChange,
  onDone,
}: {
  place: Place | null;
  onBusyChange: (busy: boolean) => void;
  onDone: (saved?: Place) => void;
}) {
  const { createPlace, updatePlace } = usePichanga();

  // Google-only data that has no field of its own in the form.
  const meta = useRef({
    googlePlaceId: place?.googlePlaceId ?? null,
    lat: place?.lat ?? null,
    lng: place?.lng ?? null,
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: place?.name ?? "",
      address: place?.address ?? "",
      mapsUrl: place?.mapsUrl ?? "",
    },
  });

  const { run, pending } = useAction(
    async (values: FormValues) => {
      const payload = {
        name: values.name,
        address: values.address?.trim() || null,
        mapsUrl: values.mapsUrl?.trim() || null,
        googlePlaceId: meta.current.googlePlaceId,
        lat: meta.current.lat,
        lng: meta.current.lng,
      };

      return place ? updatePlace(place.id, payload) : createPlace(payload);
    },
    {
      success: place ? "Place updated" : "Place created",
      onSuccess: (saved) => saved && onDone(saved),
    },
  );

  const errors = form.formState.errors;

  return (
    <form
      className="space-y-5"
      onSubmit={form.handleSubmit(async (values) => {
        onBusyChange(true);
        await run(values);
        onBusyChange(false);
      })}
    >
      <PlaceSearchField
        disabled={pending}
        onPicked={(details) => {
          meta.current = {
            googlePlaceId: details.googlePlaceId ?? null,
            lat: details.lat ?? null,
            lng: details.lng ?? null,
          };
          form.setValue("name", details.name, { shouldValidate: true });
          form.setValue("address", details.address ?? "");
          form.setValue("mapsUrl", details.mapsUrl ?? "");
        }}
      />

      <Field label="Name" error={errors.name?.message}>
        <Input
          placeholder="Eureka El Polo"
          autoComplete="off"
          disabled={pending}
          aria-invalid={!!errors.name}
          {...form.register("name")}
        />
      </Field>

      <Field label="Address" error={errors.address?.message}>
        <Input
          placeholder="Av. El Polo 505, Santiago de Surco"
          autoComplete="off"
          disabled={pending}
          {...form.register("address")}
        />
      </Field>

      <Field
        label="Maps link"
        error={errors.mapsUrl?.message}
        hint="Opens the venue in Google Maps."
      >
        <Input
          placeholder="https://maps.google.com/..."
          autoComplete="off"
          disabled={pending}
          aria-invalid={!!errors.mapsUrl}
          {...form.register("mapsUrl")}
        />
      </Field>

      <DialogFooter>
        <Button
          type="button"
          variant="ghost"
          disabled={pending}
          onClick={() => onDone()}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? <Spinner /> : null}
          {place ? "Save changes" : "Create place"}
        </Button>
      </DialogFooter>
    </form>
  );
}
