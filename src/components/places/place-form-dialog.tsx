"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRef } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { useLocale } from "@/components/providers/locale-provider";
import { problem } from "@/i18n/dictionaries";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { useAction } from "@/hooks/use-action";
import { PITCH_FORMATS } from "@/lib/constants";
import { CURRENCY } from "@/lib/money";
import type { Place } from "@/types";
import { PlaceSearchField } from "./place-search-field";

const formSchema = z.object({
  name: z.string().trim().min(2, "places.nameTooShort").max(80),
  address: z.string().trim().max(200).optional(),
  mapsUrl: z.union([z.string().url("places.badUrl"), z.literal("")]).optional(),
  // Same as the price: text, so an empty field means "nobody has said".
  format: z.string().optional(),
  // Kept as text so an empty field means "no price" instead of zero.
  price: z
    .string()
    .trim()
    .refine((value) => value === "" || Number(value) >= 0, "places.negative")
    .refine(
      (value) => value === "" || Number.isFinite(Number(value)),
      "places.notANumber",
    )
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
  const { t } = useLocale();
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
          <DialogTitle>
            {place ? t.places.formEdit : t.places.formNew}
          </DialogTitle>
          <DialogDescription>{t.places.formHint}</DialogDescription>
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
  const { t } = useLocale();
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
      price: place?.price != null ? String(place.price) : "",
      format: place?.format != null ? String(place.format) : "",
    },
  });

  const { run, pending } = useAction(
    async (values: FormValues) => {
      const payload = {
        name: values.name,
        address: values.address?.trim() || null,
        mapsUrl: values.mapsUrl?.trim() || null,
        price: values.price?.trim() ? Number(values.price) : null,
        format: values.format
          ? (Number(values.format) as (typeof PITCH_FORMATS)[number])
          : null,
        googlePlaceId: meta.current.googlePlaceId,
        lat: meta.current.lat,
        lng: meta.current.lng,
      };

      return place ? updatePlace(place.id, payload) : createPlace(payload);
    },
    {
      success: place ? t.places.updated : t.places.created,
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

      <Field label={t.places.name} error={problem(t, errors.name?.message)}>
        <Input
          placeholder={t.places.namePlaceholder}
          autoComplete="off"
          disabled={pending}
          aria-invalid={!!errors.name}
          {...form.register("name")}
        />
      </Field>

      <Field
        label={t.places.address}
        error={problem(t, errors.address?.message)}
      >
        <Input
          placeholder={t.places.addressPlaceholder}
          autoComplete="off"
          disabled={pending}
          {...form.register("address")}
        />
      </Field>

      <Field
        label={`Rental price (${CURRENCY})`}
        error={problem(t, errors.price?.message)}
        hint={t.places.priceHint}
      >
        <Input
          type="number"
          min="0"
          step="0.01"
          inputMode="decimal"
          placeholder="120"
          autoComplete="off"
          disabled={pending}
          aria-invalid={!!errors.price}
          {...form.register("price")}
        />
      </Field>

      <Field
        label={t.places.formatLabel}
        error={problem(t, errors.format?.message)}
        hint={t.places.formatHint}
      >
        <Controller
          control={form.control}
          name="format"
          render={({ field }) => (
            <Select
              value={field.value || undefined}
              onValueChange={field.onChange}
              disabled={pending}
            >
              <SelectTrigger aria-invalid={!!errors.format}>
                <SelectValue placeholder={t.places.notSet} />
              </SelectTrigger>
              <SelectContent>
                {PITCH_FORMATS.map((format) => (
                  <SelectItem key={format} value={String(format)}>
                    {format} a side
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </Field>

      <Field
        label={t.places.mapsLink}
        error={problem(t, errors.mapsUrl?.message)}
        hint={t.places.mapsHint}
      >
        <Input
          placeholder={t.places.mapsPlaceholder}
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
          {t.common.cancel}
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? <Spinner /> : null}
          {place ? t.places.saveChanges : t.places.createPlace}
        </Button>
      </DialogFooter>
    </form>
  );
}
