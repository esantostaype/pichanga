"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRef } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { useLocale } from "@/components/providers/locale-provider";
import { fill, problem } from "@/i18n/dictionaries";
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
import type { Venue } from "@/types";
import { VenueSearchField } from "./venue-search-field";

const formSchema = z.object({
  name: z.string().trim().min(2, "venues.nameTooShort").max(80),
  address: z.string().trim().max(200).optional(),
  mapsUrl: z.union([z.string().url("venues.badUrl"), z.literal("")]).optional(),
  // Same as the price: text, so an empty field means "nobody has said".
  format: z.string().optional(),
  // Kept as text so an empty field means "no price" instead of zero.
  price: z
    .string()
    .trim()
    .refine((value) => value === "" || Number(value) >= 0, "venues.negative")
    .refine(
      (value) => value === "" || Number.isFinite(Number(value)),
      "venues.notANumber",
    )
    .optional(),
});

type FormValues = z.infer<typeof formSchema>;

type VenueFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  venue?: Venue | null;
  onSaved?: (venue: Venue) => void;
};

export function VenueFormDialog({
  open,
  onOpenChange,
  venue,
  onSaved,
}: VenueFormDialogProps) {
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
            {venue ? t.venues.formEdit : t.venues.formNew}
          </DialogTitle>
          <DialogDescription>{t.venues.formHint}</DialogDescription>
        </DialogHeader>

        <VenueForm
          venue={venue ?? null}
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

function VenueForm({
  venue,
  onBusyChange,
  onDone,
}: {
  venue: Venue | null;
  onBusyChange: (busy: boolean) => void;
  onDone: (saved?: Venue) => void;
}) {
  const { t } = useLocale();
  const { createVenue, updateVenue } = usePichanga();

  // Google-only data that has no field of its own in the form.
  const meta = useRef({
    googlePlaceId: venue?.googlePlaceId ?? null,
    lat: venue?.lat ?? null,
    lng: venue?.lng ?? null,
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: venue?.name ?? "",
      address: venue?.address ?? "",
      mapsUrl: venue?.mapsUrl ?? "",
      price: venue?.price != null ? String(venue.price) : "",
      format: venue?.format != null ? String(venue.format) : "",
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

      return venue ? updateVenue(venue.id, payload) : createVenue(payload);
    },
    {
      success: venue ? t.venues.updated : t.venues.created,
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
      <VenueSearchField
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

      <Field label={t.venues.name} error={problem(t, errors.name?.message)}>
        <Input
          placeholder={t.venues.namePlaceholder}
          autoComplete="off"
          disabled={pending}
          aria-invalid={!!errors.name}
          {...form.register("name")}
        />
      </Field>

      <Field
        label={t.venues.address}
        error={problem(t, errors.address?.message)}
      >
        <Input
          placeholder={t.venues.addressPlaceholder}
          autoComplete="off"
          disabled={pending}
          {...form.register("address")}
        />
      </Field>

      <Field
        label={fill(t.venues.priceLabel, { currency: CURRENCY })}
        error={problem(t, errors.price?.message)}
        hint={t.venues.priceHint}
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
        label={t.venues.formatLabel}
        error={problem(t, errors.format?.message)}
        hint={t.venues.formatHint}
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
                <SelectValue placeholder={t.venues.notSet} />
              </SelectTrigger>
              <SelectContent>
                {PITCH_FORMATS.map((format) => (
                  <SelectItem key={format} value={String(format)}>
                    {fill(t.venues.side, { count: format })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </Field>

      <Field
        label={t.venues.mapsLink}
        error={problem(t, errors.mapsUrl?.message)}
        hint={t.venues.mapsHint}
      >
        <Input
          placeholder={t.venues.mapsPlaceholder}
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
          {venue ? t.venues.saveChanges : t.venues.createVenue}
        </Button>
      </DialogFooter>
    </form>
  );
}
