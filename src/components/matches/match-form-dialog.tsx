"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { UserAdd01Icon } from "@hugeicons/core-free-icons";
import { useEffect, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

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
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useAction } from "@/hooks/use-action";
import { api } from "@/lib/api-client";
import { suggestedMatchDate, toDateInput, toTimeInput } from "@/lib/date";
import { toEpoch } from "@/lib/validators";
import type { MatchSummary } from "@/types";

const formSchema = z.object({
  date: z.string().min(1, "Pick a date"),
  time: z.string().min(1, "Pick a time"),
  location: z.string().trim().max(80, "At most 80 characters").optional(),
});

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
          <DialogTitle>{match ? "Edit match" : "New match"}</DialogTitle>
          <DialogDescription>
            Pick the date and who plays. The closest match is the one shown on
            the pitch.
          </DialogDescription>
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
  const { players, createMatch, updateMatch } = usePichanga();

  const [selected, setSelected] = useState<string[]>([]);
  const [playerFormOpen, setPlayerFormOpen] = useState(false);

  const base = match?.playedAt ?? suggestedMatchDate();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: toDateInput(base),
      time: toTimeInput(base),
      location: match?.location ?? "",
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
        location: values.location?.trim() || null,
        playerIds: selected,
      };

      return match ? updateMatch(match.id, payload) : createMatch(payload);
    },
    {
      success: match ? "Match updated" : "Match created",
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
          <Field label="Date" error={errors.date?.message}>
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

          <Field label="Time" error={errors.time?.message}>
            <Input
              type="time"
              disabled={pending}
              aria-invalid={!!errors.time}
              {...form.register("time")}
            />
          </Field>

          <Field label="Place" error={errors.location?.message}>
            <Input
              placeholder="Pitch 3"
              autoComplete="off"
              disabled={pending}
              {...form.register("location")}
            />
          </Field>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Players {selected.length}
            </p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={pending}
              onClick={() => setPlayerFormOpen(true)}
            >
              <Icon icon={UserAdd01Icon} size={15} />
              New player
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
            Cancel
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? <Spinner /> : null}
            {match ? "Save changes" : "Create match"}
          </Button>
        </DialogFooter>
      </form>

      <PlayerFormDialog
        open={playerFormOpen}
        onOpenChange={setPlayerFormOpen}
        onSaved={(player) => setSelected((prev) => [...prev, player.id])}
      />
    </>
  );
}
