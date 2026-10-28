"use client";

import { useState } from "react";

import { CrestEditor } from "@/components/matches/crest-editor";
import { useLocale } from "@/components/providers/locale-provider";
import { usePichanga } from "@/components/providers/pichanga-provider";
import { PlayerPicker } from "@/components/players/player-picker";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useAction } from "@/hooks/use-action";
import { fill } from "@/i18n/dictionaries";
import { accentsFor } from "@/lib/teams";
import type { SavedTeam } from "@/types";

/**
 * Crear o editar un equipo guardado: nombre, escudo y quiénes lo forman.
 *
 * Los jugadores salen de la lista de jugadores de siempre, no de un partido:
 * un equipo guardado existe aunque no haya partido esta semana.
 */
export function SavedTeamFormDialog({
  open,
  onOpenChange,
  team,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** El equipo a editar, o null para crear uno nuevo. */
  team: SavedTeam | null;
}) {
  const { t } = useLocale();
  const { players, createSavedTeam, updateSavedTeam } = usePichanga();

  const [name, setName] = useState("");
  const [badge, setBadge] = useState<string | null>(null);
  const [crestUrl, setCrestUrl] = useState<string | null>(null);
  const [playerIds, setPlayerIds] = useState<string[]>([]);

  /*
   * Cada vez que se abre arranca con el equipo pedido (o vacío). Se ajusta
   * durante el render para que el primer cuadro ya muestre los datos correctos.
   */
  const [wasOpen, setWasOpen] = useState(false);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setName(team?.name ?? "");
      setBadge(team?.badge ?? null);
      setCrestUrl(team?.crestUrl ?? null);
      setPlayerIds(team?.playerIds ?? []);
    }
  }

  const save = useAction(
    async () => {
      const input = { name: name.trim(), badge, crestUrl, playerIds };
      return team ? updateSavedTeam(team.id, input) : createSavedTeam(input);
    },
    { success: t.savedTeams.saved, onSuccess: () => onOpenChange(false) },
  );

  const toggle = (id: string) =>
    setPlayerIds((prev) =>
      prev.includes(id) ? prev.filter((one) => one !== id) : [...prev, id],
    );

  // El mismo color que tendrá al guardarse, para que el escudo no cambie.
  const accent = team?.accent ?? accentsFor([name], [])[0];
  const shown = name.trim() || t.savedTeams.formNew;

  return (
    <Dialog open={open} onOpenChange={save.pending ? undefined : onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {team ? t.savedTeams.formEdit : t.savedTeams.formNew}
          </DialogTitle>
          <DialogDescription>{t.savedTeams.formLine}</DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-3">
          <CrestEditor
            name={shown}
            accent={accent}
            badge={badge}
            image={crestUrl}
            onBadge={setBadge}
            onImage={setCrestUrl}
            disabled={save.pending}
          />
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={t.teams.teamName}
            aria-label={t.teams.teamName}
            maxLength={30}
            disabled={save.pending}
            className="font-display text-base uppercase tracking-[0.04em] placeholder:normal-case placeholder:tracking-normal"
          />
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">
            {t.savedTeams.pickPlayers}{" "}
            <span className="text-muted-foreground">
              · {fill(t.savedTeams.players, { count: playerIds.length })}
            </span>
          </p>
          <PlayerPicker
            players={players}
            selected={playerIds}
            onToggle={toggle}
            className="max-h-72"
          />
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            disabled={save.pending}
            onClick={() => onOpenChange(false)}
          >
            {t.common.cancel}
          </Button>
          <Button
            disabled={name.trim() === "" || save.pending}
            onClick={() => void save.run()}
          >
            {save.pending ? <Spinner /> : null}
            {t.savedTeams.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
