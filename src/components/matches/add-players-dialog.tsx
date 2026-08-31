"use client";

import { UserAdd01Icon } from "@hugeicons/core-free-icons";
import { useMemo, useRef, useState } from "react";

import { useLocale } from "@/components/providers/locale-provider";
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
import { Icon } from "@/components/ui/icon";
import { Spinner } from "@/components/ui/spinner";
import { useAction } from "@/hooks/use-action";
import { fill } from "@/i18n/dictionaries";
import { formatShortDate } from "@/lib/date";

/** Adds players to the match currently on the pitch. */
export function AddPlayersDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const busy = useRef(false);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!busy.current) onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-xl">
        <AddPlayersForm
          onBusyChange={(value) => (busy.current = value)}
          onDone={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function AddPlayersForm({
  onBusyChange,
  onDone,
}: {
  onBusyChange: (busy: boolean) => void;
  onDone: () => void;
}) {
  const { t, locale } = useLocale();
  const { players, nextMatch, addPlayersToNextMatch } = usePichanga();

  const [selected, setSelected] = useState<string[]>([]);
  const [playerFormOpen, setPlayerFormOpen] = useState(false);

  const lockedIds = useMemo(
    () => nextMatch?.players.map((player) => player.id) ?? [],
    [nextMatch],
  );

  const toggle = (playerId: string) =>
    setSelected((prev) =>
      prev.includes(playerId)
        ? prev.filter((id) => id !== playerId)
        : [...prev, playerId],
    );

  const { run, pending } = useAction(
    async () => addPlayersToNextMatch(selected),
    { success: t.addPlayers.done, onSuccess: () => onDone() },
  );

  return (
    <>
      <DialogHeader>
        <DialogTitle>{t.addPlayers.title}</DialogTitle>
        <DialogDescription>
          {nextMatch
            ? fill(t.addPlayers.onDate, {
                date: formatShortDate(nextMatch.playedAt, locale),
                count: lockedIds.length,
              })
            : t.addPlayers.noMatch}
        </DialogDescription>
      </DialogHeader>

      <div className="flex justify-end">
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
        lockedIds={lockedIds}
        className="max-h-[22rem]"
      />

      <DialogFooter>
        <Button variant="ghost" disabled={pending} onClick={onDone}>
          {t.common.cancel}
        </Button>
        <Button
          disabled={pending || !selected.length || !nextMatch}
          onClick={async () => {
            onBusyChange(true);
            await run();
            onBusyChange(false);
          }}
        >
          {pending ? <Spinner /> : null}
          Add {selected.length || ""}
        </Button>
      </DialogFooter>

      <PlayerFormDialog
        open={playerFormOpen}
        onOpenChange={setPlayerFormOpen}
        onSaved={(player) => setSelected((prev) => [...prev, player.id])}
      />
    </>
  );
}
