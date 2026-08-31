"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Location01Icon, UserAdd01Icon } from "@hugeicons/core-free-icons";
import { useEffect, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { useLocale } from "@/components/providers/locale-provider";
import { problem } from "@/i18n/dictionaries";
import { PlaceFormDialog } from "@/components/places/place-form-dialog";
import { PlayerFormDialog } from "@/components/players/player-form-dialog";
import { PlayerPicker } from "@/components/players/player-picker";
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
import { DatePicker } from "@/components/ui/date-picker";
import { Field } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { TimePicker } from "@/components/ui/time-picker";
import { useAction } from "@/hooks/use-action";
import { api } from "@/lib/api-client";
import { SUGGESTED_MATCH_LENGTH_MS } from "@/lib/constants";
import { suggestedMatchDate, toDateInput, toTimeInput } from "@/lib/date";
import { toEpoch } from "@/lib/validators";
import type { MatchSummary } from "@/types";

/** Sentinels: Radix Select cannot hold an empty string value. */
const NO_PLACE = "none";
const NO_ORGANIZER = "none";

const formSchema = z
  .object({
    date: z.string().min(1, "matches.pickDate"),
    time: z.string().min(1, "matches.pickStart"),
    endTime: z.string().min(1, "matches.pickEnd"),
    placeId: z.string(),
    organizerId: z.string(),
    recurring: z.boolean(),
  })
  .refine(
    (values) =>
      toEpoch(values.date, values.endTime) > toEpoch(values.date, values.time),
    {
      message: "matches.afterStart",
      path: ["endTime"],
    },
  );

type FormValues = z.infer<typeof formSchema>;

type MatchFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When present the dialog edits that match. */
  match?: MatchSummary | null;
};

export function MatchFormDialog({
  open,
  onOpenChange,
  match,
}: MatchFormDialogProps) {
  const { t } = useLocale();
  const busy = useRef(false);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!busy.current) onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {match ? t.matches.formEdit : t.matches.formNew}
          </DialogTitle>
          <DialogDescription>{t.matches.formHint}</DialogDescription>
        </DialogHeader>

        <MatchForm
          match={match ?? null}
          onBusyChange={(value) => (busy.current = value)}
          onDone={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function MatchForm({
  match,
  onBusyChange,
  onDone,
}: {
  match: MatchSummary | null;
  onBusyChange: (busy: boolean) => void;
  onDone: () => void;
}) {
  const { t } = useLocale();
  const { players, places, createMatch, updateMatch } = usePichanga();

  const [selected, setSelected] = useState<string[]>([]);
  const [playerFormOpen, setPlayerFormOpen] = useState(false);
  const [placeFormOpen, setPlaceFormOpen] = useState(false);

  const base = match?.playedAt ?? suggestedMatchDate();
  const baseEnd = match?.endsAt ?? base + SUGGESTED_MATCH_LENGTH_MS;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: toDateInput(base),
      time: toTimeInput(base),
      endTime: toTimeInput(baseEnd),
      placeId: match?.place?.id ?? NO_PLACE,
      organizerId: match?.organizerId ?? NO_ORGANIZER,
      recurring: match?.recurrence === "weekly",
    },
  });

  // When editing, the lineup arrives separately: the table only carries counts.
  useEffect(() => {
    if (!match) return;

    let cancelled = false;

    api.matches
      .get(match.id)
      .then((full) => {
        if (!cancelled) setSelected(full.players.map((player) => player.id));
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [match]);

  const toggle = (playerId: string) =>
    setSelected((prev) =>
      prev.includes(playerId)
        ? prev.filter((id) => id !== playerId)
        : [...prev, playerId],
    );

  const { run, pending } = useAction(
    async (values: FormValues) => {
      const payload = {
        playedAt: toEpoch(values.date, values.time),
        endsAt: toEpoch(values.date, values.endTime),
        placeId: values.placeId === NO_PLACE ? null : values.placeId,
        organizerId:
          values.organizerId === NO_ORGANIZER ? null : values.organizerId,
        recurrence: values.recurring ? ("weekly" as const) : null,
        playerIds: selected,
      };

      return match ? updateMatch(match.id, payload) : createMatch(payload);
    },
    {
      success: match ? t.matches.updated : t.matches.created,
      onSuccess: (saved) => saved && onDone(),
    },
  );

  const errors = form.formState.errors;

  return (
    <>
      <form
        className="space-y-5"
        onSubmit={form.handleSubmit(async (values) => {
          onBusyChange(true);
          await run(values);
          onBusyChange(false);
        })}
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <Field
            label={t.matches.date}
            error={problem(t, errors.date?.message)}
          >
            <Controller
              control={form.control}
              name="date"
              render={({ field }) => (
                <DatePicker
                  value={field.value}
                  onChange={field.onChange}
                  disabled={pending}
                  invalid={!!errors.date}
                />
              )}
            />
          </Field>

          <Field
            label={t.matches.starts}
            error={problem(t, errors.time?.message)}
          >
            <Controller
              control={form.control}
              name="time"
              render={({ field }) => (
                <TimePicker
                  value={field.value}
                  onChange={(next) => {
                    field.onChange(next);

                    /*
                     * The end follows the start, always: move the kick-off an
                     * hour later and the whistle goes with it. Only correcting
                     * it when it fell behind meant a match moved from 8 to 9
                     * kept a 9 o'clock finish, which is a match with no time in
                     * it. Editing the end by hand still sticks -- until the
                     * start moves again, which is when the assumption is worth
                     * making a second time.
                     */
                    const start = toEpoch(form.getValues("date"), next);

                    form.setValue(
                      "endTime",
                      toTimeInput(start + SUGGESTED_MATCH_LENGTH_MS),
                      { shouldValidate: true },
                    );
                  }}
                  disabled={pending}
                  invalid={!!errors.time}
                />
              )}
            />
          </Field>

          <Field
            label={t.matches.ends}
            error={problem(t, errors.endTime?.message)}
          >
            <Controller
              control={form.control}
              name="endTime"
              render={({ field }) => (
                <TimePicker
                  value={field.value}
                  onChange={field.onChange}
                  disabled={pending}
                  invalid={!!errors.endTime}
                />
              )}
            />
          </Field>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t.matches.place}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={pending}
              onClick={() => setPlaceFormOpen(true)}
            >
              <Icon icon={Location01Icon} size={15} />
              {t.places.newPlace}
            </Button>
          </div>

          <Controller
            control={form.control}
            name="placeId"
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={field.onChange}
                disabled={pending}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t.matches.pickPlace} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_PLACE}>
                    {t.matches.noPlaceYet}
                  </SelectItem>
                  {places.map((place) => (
                    <SelectItem key={place.id} value={place.id}>
                      {place.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div className="space-y-1.5">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {t.matches.organizer}
          </span>

          <Controller
            control={form.control}
            name="organizerId"
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={(next) => {
                  field.onChange(next);
                  // They play, so tick them: the crown needs a token.
                  if (next !== NO_ORGANIZER) {
                    setSelected((prev) =>
                      prev.includes(next) ? prev : [...prev, next],
                    );
                  }
                }}
                disabled={pending}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t.matches.pickOrganizer} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_ORGANIZER}>
                    {t.matches.noOrganizerYet}
                  </SelectItem>
                  {players.map((player) => (
                    <SelectItem key={player.id} value={player.id}>
                      {player.firstName} {player.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <Controller
          control={form.control}
          name="recurring"
          render={({ field }) => (
            <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-border/60 bg-muted/25 px-4 py-3">
              <span className="space-y-0.5">
                <span className="block text-sm font-medium">
                  {t.matches.repeatWeekly}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {t.matches.repeatWeeklyLine}
                </span>
              </span>
              <Switch
                checked={field.value}
                onCheckedChange={field.onChange}
                disabled={pending}
                aria-label={t.matches.repeatWeekly}
              />
            </label>
          )}
        />

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t.matches.playersLabel} {selected.length}
            </p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={pending}
              onClick={() => setPlayerFormOpen(true)}
            >
              <Icon icon={UserAdd01Icon} size={15} />
              {t.players.newPlayer}
            </Button>
          </div>

          <PlayerPicker
            players={players}
            selected={selected}
            onToggle={toggle}
            className="max-h-72"
          />
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            disabled={pending}
            onClick={onDone}
          >
            {t.common.cancel}
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? <Spinner /> : null}
            {match ? t.matches.saveChanges : t.matches.createMatch}
          </Button>
        </DialogFooter>
      </form>

      <PlayerFormDialog
        open={playerFormOpen}
        onOpenChange={setPlayerFormOpen}
        onSaved={(player) => setSelected((prev) => [...prev, player.id])}
      />

      <PlaceFormDialog
        open={placeFormOpen}
        onOpenChange={setPlaceFormOpen}
        onSaved={(place) =>
          form.setValue("placeId", place.id, { shouldValidate: true })
        }
      />
    </>
  );
}
