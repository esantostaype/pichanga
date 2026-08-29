"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { useAction } from "@/hooks/use-action";
import { api } from "@/lib/api-client";
import { AREAS, POSITIONS, SKILLS, SKILL_DEFAULT } from "@/lib/constants";
import { playerInputSchema } from "@/lib/validators";
import type { Player } from "@/types";
import { PhotoField } from "./photo-field";
import { SkillField } from "./skill-field";

const formSchema = playerInputSchema.pick({
  firstName: true,
  lastName: true,
  area: true,
  position: true,
  skills: true,
});

type FormValues = z.infer<typeof formSchema>;

type PlayerFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When present the dialog edits instead of creating. */
  player?: Player | null;
  onSaved?: (player: Player) => void;
};

export function PlayerFormDialog({
  open,
  onOpenChange,
  player,
  onSaved,
}: PlayerFormDialogProps) {
  // Prevents closing mid-save without lifting the form state out.
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
          <DialogTitle>{player ? "Edit player" : "New player"}</DialogTitle>
          <DialogDescription>
            The profile is saved for future matches.
          </DialogDescription>
        </DialogHeader>

        {/* Mounted on open: initial values never need a reset. */}
        <PlayerForm
          player={player ?? null}
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

function PlayerForm({
  player,
  onBusyChange,
  onDone,
}: {
  player: Player | null;
  onBusyChange: (busy: boolean) => void;
  onDone: (saved?: Player) => void;
}) {
  const { createPlayer, updatePlayer } = usePichanga();
  const [file, setFile] = useState<File | null>(null);
  const [photoRemoved, setPhotoRemoved] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: player
      ? {
          firstName: player.firstName,
          lastName: player.lastName,
          area: player.area as FormValues["area"],
          position: player.position,
          skills: player.skills as FormValues["skills"],
        }
      : {
          firstName: "",
          lastName: "",
          area: "dev",
          position: "mid",
          // Average until somebody says otherwise, so a new player balances
          // into a team without anybody having to rate them first.
          skills: Object.fromEntries(
            SKILLS.map((skill) => [skill.id, SKILL_DEFAULT]),
          ) as FormValues["skills"],
        },
  });

  const { run, pending } = useAction(
    async (values: FormValues) => {
      let photoUrl = photoRemoved ? null : (player?.photoUrl ?? null);
      let photoPublicId = photoRemoved ? null : (player?.photoPublicId ?? null);

      if (file) {
        const uploaded = await api.uploadPhoto(file);
        photoUrl = uploaded.url;
        photoPublicId = uploaded.publicId;
      }

      const payload = { ...values, photoUrl, photoPublicId };

      return player ? updatePlayer(player.id, payload) : createPlayer(payload);
    },
    {
      success: player ? "Player updated" : "Player created",
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
      <PhotoField
        currentUrl={photoRemoved ? null : (player?.photoUrl ?? null)}
        file={file}
        onSelect={(next) => {
          setFile(next);
          if (next) setPhotoRemoved(false);
        }}
        onClear={() => setPhotoRemoved(true)}
        disabled={pending}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="First name" error={errors.firstName?.message}>
          <Input
            placeholder="Diego"
            autoComplete="off"
            disabled={pending}
            aria-invalid={!!errors.firstName}
            {...form.register("firstName")}
          />
        </Field>

        <Field label="Last name" error={errors.lastName?.message}>
          <Input
            placeholder="Maradona"
            autoComplete="off"
            disabled={pending}
            aria-invalid={!!errors.lastName}
            {...form.register("lastName")}
          />
        </Field>
      </div>

      <Field label="Area" error={errors.area?.message}>
        <Controller
          control={form.control}
          name="area"
          render={({ field }) => (
            <Select
              value={field.value}
              onValueChange={field.onChange}
              disabled={pending}
            >
              <SelectTrigger aria-invalid={!!errors.area}>
                <SelectValue placeholder="Pick an area" />
              </SelectTrigger>
              <SelectContent>
                {AREAS.map((area) => (
                  <SelectItem key={area.id} value={area.id}>
                    <span className="flex items-center gap-2">
                      <span
                        className="size-2 rounded-full"
                        style={{ backgroundColor: area.color }}
                      />
                      {area.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </Field>

      <Field label="Position" error={errors.position?.message}>
        <Controller
          control={form.control}
          name="position"
          render={({ field }) => (
            <Select
              value={field.value}
              onValueChange={field.onChange}
              disabled={pending}
            >
              <SelectTrigger aria-invalid={!!errors.position}>
                <SelectValue placeholder="Pick a position" />
              </SelectTrigger>
              <SelectContent>
                {POSITIONS.map((position) => (
                  <SelectItem key={position.id} value={position.id}>
                    {position.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </Field>

      {/*
        The numbers behind the balancing. They are nobody's business but the
        team sheet's, so they live here and never on the pitch.
      */}
      <div className="grid gap-3 rounded-2xl border border-border/60 bg-muted/20 p-4">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          Skills
        </p>

        {SKILLS.map((skill) => (
          <Controller
            key={skill.id}
            control={form.control}
            name={`skills.${skill.id}`}
            render={({ field }) => (
              <SkillField
                label={skill.label}
                value={field.value}
                onChange={field.onChange}
                disabled={pending}
              />
            )}
          />
        ))}
      </div>

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
          {player ? "Save changes" : "Create player"}
        </Button>
      </DialogFooter>
    </form>
  );
}
