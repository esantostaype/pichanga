"use client";

import {
  PlusSignIcon,
  Shield01Icon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons";
import gsap from "gsap";
import { Flip } from "gsap/Flip";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { useLocale } from "@/components/providers/locale-provider";
import { usePichanga } from "@/components/providers/pichanga-provider";
import { PlayerAvatar } from "@/components/players/player-avatar";
import { PlayerPicker } from "@/components/players/player-picker";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Reveal } from "@/components/ui/reveal";
import { Spinner } from "@/components/ui/spinner";
import { useAction } from "@/hooks/use-action";
import { fill } from "@/i18n/dictionaries";
import { EASE } from "@/lib/ease";
import { accentsFor } from "@/lib/teams";
import { cn } from "@/lib/utils";
import type { ManualSide } from "@/lib/validators";
import type { Match, Player, SavedTeam } from "@/types";
import { TeamCrest } from "./team-crest";
import { CrestEditor } from "./crest-editor";

gsap.registerPlugin(Flip);

const MAX_SIDES = 6;

/** Un equipo tal como lo guarda este formulario: el escudo siempre explícito. */
type Side = ManualSide & {
  badge: string | null;
  crestUrl: string | null;
  accent: string | null;
};

const emptySide = (): Side => ({
  name: "",
  playerIds: [],
  badge: null,
  crestUrl: null,
  accent: null,
});

/**
 * Los equipos, armados a mano.
 *
 * Todo aquí es un borrador: el armado vive en este componente hasta que se
 * guarda, y recién entonces llega al partido en una sola petición. Así, echarse
 * atrás no cuesta nada, porque armar a mano es probar varias combinaciones.
 *
 * El sorteo sigue siendo lo que hace el botón. Esta es la segunda opción, para
 * la semana en que el sorteo no convence, y también puede ser la primera: sin
 * equipos todavía, aquí se crean desde cero.
 *
 * Aquí no se nivela nada ni se muestra nada que lo sugiera. Los equipos hechos
 * a mano son los que alguien quiso; los promedios son cosa del sorteo, que es
 * lo que promete un partido parejo.
 *
 * Y nada se mueve de golpe. Un equipo, un jugador o la banca que llega crece
 * en su lugar y empuja a los de al lado; al salir, primero se encoge y los
 * demás cierran el hueco. Un jugador que pasa de la banca a un equipo, o de un
 * equipo a otro, viaja hasta allá: el mismo `data-flip-id` en el chip y en la
 * fila es lo que le permite a Flip de GSAP verlos como una sola cosa.
 */
export function ManualTeams({
  match,
  onCancel,
  onSaved,
}: {
  match: Match;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const { t } = useLocale();
  const { setTeamsManually, savedTeams, addPlayersToNextMatch } =
    usePichanga();

  const squad = match.players;
  const byId = useMemo(
    () => new Map(squad.map((player) => [player.id, player])),
    [squad],
  );

  /*
   * Arranca con los equipos tal como están, para que al abrir se vea lo que ya
   * hay y no una hoja en blanco: casi siempre se parte de "el sorteo, pero
   * cambiando a esos dos". Sin equipos todavía son dos vacíos y sin nombre: el
   * nombre es justo lo que viene a poner quien los arma.
   */
  const [sides, setSides] = useState<Side[]>(() =>
    match.teams.length >= 2
      ? match.teams.map((team) => ({
          name: team.name,
          playerIds: [...team.playerIds],
          badge: team.badge,
          crestUrl: team.crestUrl,
          accent: team.accent,
        }))
      : [emptySide(), emptySide()],
  );

  /** Qué equipo tiene abierto el selector de jugadores, o null. */
  const [picking, setPicking] = useState<number | null>(null);

  /** Pregunta antes de guardar si queda gente en la banca. */
  const [confirmingLeave, setConfirmingLeave] = useState(false);

  const placed = useMemo(
    () => new Set(sides.flatMap((side) => side.playerIds)),
    [sides],
  );

  // Los mismos colores que pondrá el servidor, para que nada cambie al guardar.
  const accents = accentsFor(
    sides.map((side) => side.name),
    match.teams.map((team) => team.accent),
    sides.map((side) => side.accent),
  );
  const waiting = squad.filter((player) => !placed.has(player.id));

  /* ----------------------------- el movimiento ---------------------------- */

  const root = useRef<HTMLDivElement>(null);
  const flip = useRef<Flip.FlipState | null>(null);

  const flipping = () =>
    root.current?.querySelectorAll<HTMLElement>("[data-flip-id]") ?? [];

  /**
   * Cambia el armado moviendo todo lo que hay en pantalla para acomodarse.
   *
   * Lo que va a irse se encoge primero, mientras todavía existe para animarlo;
   * luego se anota dónde está cada cosa, cambia el estado, y el efecto de
   * layout de abajo desliza cada pieza desde ahí hasta su nuevo lugar.
   */
  const change = (update: () => void, leaving: Element[] = []) => {
    const commit = () => {
      flip.current = Flip.getState(flipping());
      update();
    };

    if (leaving.length === 0) return commit();

    gsap.to(leaving, {
      autoAlpha: 0,
      scale: 0.9,
      duration: 0.22,
      ease: "power2.in",
      onComplete: commit,
    });
  };

  useLayoutEffect(() => {
    const state = flip.current;
    if (!state) return;
    flip.current = null;

    Flip.from(state, {
      targets: flipping(),
      duration: 0.5,
      ease: EASE,
      nested: true,
      prune: true,
      // Cambia ancho y alto en vez de estirar, para que el texto de una tarjeta
      // que crece no se deforme mientras llega a su nuevo tamaño.
      scale: false,
      onEnter: (entering) =>
        gsap.fromTo(
          entering,
          { autoAlpha: 0, scale: 0.92 },
          { autoAlpha: 1, scale: 1, duration: 0.4, ease: EASE },
        ),
    });
  }, [sides]);

  /* ------------------------------ los cambios ----------------------------- */

  const setCount = (count: number) => {
    if (count === sides.length) return;

    // Crecer agrega equipos vacíos; achicar manda a los últimos a la banca en
    // vez de adivinar dónde debería ir esa gente.
    const leaving =
      count < sides.length
        ? sides
            .slice(count)
            .map((_, at) =>
              root.current?.querySelector(`[data-flip-id="side-${count + at}"]`),
            )
            .filter((el): el is Element => !!el)
        : [];

    change(
      () =>
        setSides((prev) =>
          count > prev.length
            ? [
                ...prev,
                ...Array.from({ length: count - prev.length }, emptySide),
              ]
            : prev.slice(0, count),
        ),
      leaving,
    );
  };

  /** Edita un equipo en su lugar: el nombre o el escudo. Nada se mueve. */
  const patch = (index: number, next: Partial<Side>) =>
    setSides((prev) =>
      prev.map((side, at) => (at === index ? { ...side, ...next } : side)),
    );

  const addTo = (index: number, ids: string[]) =>
    change(() =>
      setSides((prev) =>
        prev.map((side, at) => ({
          ...side,
          playerIds:
            at === index
              ? [
                  ...side.playerIds,
                  ...ids.filter((id) => !side.playerIds.includes(id)),
                ]
              : side.playerIds.filter((id) => !ids.includes(id)),
        })),
      ),
    );

  const removeFrom = (index: number, id: string) =>
    change(() =>
      setSides((prev) =>
        prev.map((side, at) =>
          at === index
            ? { ...side, playerIds: side.playerIds.filter((one) => one !== id) }
            : side,
        ),
      ),
    );

  /*
   * Carga un equipo guardado en este lugar: nombre, escudo, color y jugadores.
   * Los suyos que no estén anotados se anotan solos en el partido; los que no
   * vinieron se dejan fuera. Los que estaban en otro equipo se cambian a este.
   */
  const load = useAction(
    async ({ index, team }: { index: number; team: SavedTeam }) => {
      const absent = new Set(match.noShows.map((player) => player.id));
      const signed = new Set(squad.map((player) => player.id));
      const wanted = team.playerIds.filter((id) => !absent.has(id));
      const missing = wanted.filter((id) => !signed.has(id));

      // Los nuevos aparecen en la tarjeta en cuanto llega la alineación nueva.
      if (missing.length > 0) await addPlayersToNextMatch(missing);

      patch(index, {
        name: team.name,
        badge: team.badge,
        crestUrl: team.crestUrl,
        accent: team.accent,
      });
      addTo(index, wanted);

      toast.success(
        missing.length > 0
          ? fill(t.savedTeams.loadedAdded, {
              name: team.name,
              count: missing.length,
            })
          : fill(t.savedTeams.loaded, { name: team.name }),
      );
    },
  );

  const save = useAction(
    async () =>
      setTeamsManually(
        sides.map((side) => ({ ...side, name: side.name.trim() })),
      ),
    { success: t.teams.manualSaved, onSuccess: onSaved },
  );

  /*
   * Lo que todavía impide guardar, dicho una vez y en orden: primero los
   * nombres, que es lo primero de cada tarjeta. La banca no está en la lista:
   * no todos los anotados pueden jugar siempre, y quien quede en ella sale del
   * partido al guardar, preguntando antes.
   */
  const names = sides.map((side) => side.name.trim().toLowerCase());
  const unnamed = names.some((name) => name === "");
  const repeated = new Set(names).size !== names.length;
  const blocker = unnamed
    ? t.teams.nameRequired
    : repeated
      ? t.teams.nameRepeated
      : sides.some((side) => side.playerIds.length === 0)
        ? t.teams.sideNeedsPlayers
        : null;

  /* Con nombre y con jugadores. */
  const ready = blocker === null;

  const counts = Array.from(
    {
      length: Math.max(
        0,
        Math.min(MAX_SIDES, Math.floor(squad.length / 2)) - 1,
      ),
    },
    (_, index) => index + 2,
  );

  const sideName = (index: number) =>
    sides[index]?.name.trim() ||
    fill(t.teams.sideNumber, { count: index + 1 });

  return (
    <div ref={root}>
      {/* Cuántos, primero: es la forma de todo lo que va debajo. */}
      <div className="flex flex-col gap-3 rounded-xl border border-border/60 bg-muted/20 px-4 py-3 md:flex-row md:items-center md:gap-4">
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-sm font-medium">{t.teams.sidesTitle}</span>
          <span className="text-xs text-muted-foreground">
            {t.teams.manualSidesLine}
          </span>
        </span>

        <span className="-mx-1 flex flex-wrap items-center gap-1">
          {counts.map((count) => {
            const picked = count === sides.length;

            return (
              <button
                key={count}
                type="button"
                disabled={save.pending}
                aria-pressed={picked}
                aria-label={fill(t.teams.sidesOne, { count })}
                onClick={() => setCount(count)}
                className={cn(
                  "grid size-9 shrink-0 cursor-pointer place-items-center rounded-full font-display text-sm tabular-nums transition-colors disabled:cursor-default",
                  picked
                    ? "bg-primary/15 font-semibold text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {count}
              </button>
            );
          })}
        </span>
      </div>

      <div className="mt-4 grid gap-3 grid-cols-[repeat(auto-fit,minmax(15rem,1fr))]">
        {sides.map((side, index) => {
          const placeholder = fill(t.teams.sideNumber, { count: index + 1 });
          const name = side.name.trim() || placeholder;
          const accent = accents[index];

          return (
            <section
              key={index}
              data-flip-id={`side-${index}`}
              className="rounded-2xl border p-4"
              style={{
                borderColor: `${accent}55`,
                backgroundColor: `color-mix(in oklab, ${accent} 12%, var(--background))`,
              }}
            >
              <header className="flex items-center gap-3">
                <CrestEditor
                  name={name}
                  accent={accent}
                  badge={side.badge}
                  image={side.crestUrl}
                  onBadge={(badge) => patch(index, { badge })}
                  onImage={(crestUrl) => patch(index, { crestUrl })}
                  disabled={save.pending}
                />
                <div className="min-w-0 flex-1 space-y-1">
                  {/*
                    El nombre es el título mismo y no un campo encima: lo que
                    se escribe aquí es como se llama la tarjeta, con la misma
                    letra que tendrá el equipo guardado.
                  */}
                  <Input
                    value={side.name}
                    onChange={(event) =>
                      patch(index, { name: event.target.value })
                    }
                    placeholder={placeholder}
                    aria-label={t.teams.teamName}
                    maxLength={30}
                    disabled={save.pending}
                    aria-invalid={
                      side.name.trim() !== "" &&
                      names.indexOf(names[index]) !== index
                    }
                    className="h-9 bg-background/40 font-display text-base uppercase tracking-[0.04em] placeholder:normal-case placeholder:tracking-normal"
                  />
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-muted-foreground">
                      {side.playerIds.length}{" "}
                      {side.playerIds.length === 1
                        ? t.common.player
                        : t.common.players}
                    </p>

                    {/*
                      Solo si hay equipos guardados que no estén ya cargados en
                      otra tarjeta: un mismo equipo no juega contra sí mismo.
                    */}
                    {(() => {
                      const others = new Set(
                        sides
                          .filter((_, at) => at !== index)
                          .map((one) => one.name.trim().toLowerCase()),
                      );
                      const choices = savedTeams.filter(
                        (team) => !others.has(team.name.toLowerCase()),
                      );
                      if (choices.length === 0) return null;

                      return (
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            disabled={save.pending || load.pending}
                            className="flex cursor-pointer items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground disabled:cursor-default"
                          >
                            {load.pending ? (
                              <Spinner />
                            ) : (
                              <Icon icon={Shield01Icon} size={13} />
                            )}
                            {t.savedTeams.useSaved}
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>
                              {t.savedTeams.useSaved}
                            </DropdownMenuLabel>
                            {choices.map((team) => (
                              <DropdownMenuItem
                                key={team.id}
                                onSelect={() =>
                                  void load.run({ index, team })
                                }
                              >
                                <TeamCrest
                                  name={team.name}
                                  accent={team.accent}
                                  badge={team.badge}
                                  image={team.crestUrl}
                                  size={24}
                                />
                                <span className="min-w-0 flex-1 truncate">
                                  {team.name}
                                </span>
                                <span className="text-xs tabular-nums text-muted-foreground">
                                  {team.playerIds.length}
                                </span>
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      );
                    })()}
                  </div>
                </div>
              </header>

              {/*
                Punteado, incluso cuando está lleno: es un lugar donde van
                cosas, y un borde que solo se puntea vacío parecería un error
                en vez de una invitación.
              */}
              <div className="mt-3 space-y-2 rounded-xl border border-dashed border-border/70 p-2.5">
                {side.playerIds.length === 0 ? (
                  <p
                    data-flip-id={`empty-${index}`}
                    className="px-1 py-2 text-center text-xs text-muted-foreground"
                  >
                    {t.teams.sideEmpty}
                  </p>
                ) : (
                  <ul className="space-y-1.5">
                    {side.playerIds.map((id) => {
                      const player = byId.get(id);
                      if (!player) return null;

                      return (
                        <li
                          key={id}
                          data-flip-id={`player-${id}`}
                          className="flex items-center gap-2.5"
                        >
                          <PlayerAvatar player={player} className="size-7" />
                          <span className="min-w-0 flex-1 truncate text-sm">
                            {player.firstName} {player.lastName}
                          </span>
                          <button
                            type="button"
                            disabled={save.pending}
                            onClick={() => removeFrom(index, id)}
                            aria-label={fill(t.teams.takeOut, {
                              name: player.firstName,
                            })}
                            title={fill(t.teams.takeOut, {
                              name: player.firstName,
                            })}
                            className="grid size-6 shrink-0 cursor-pointer place-items-center rounded-full text-lg leading-none text-muted-foreground/70 transition-colors hover:text-destructive disabled:cursor-default"
                          >
                            &times;
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="w-full"
                  data-flip-id={`add-${index}`}
                  disabled={save.pending}
                  onClick={() => setPicking(index)}
                >
                  <Icon icon={PlusSignIcon} />
                  {t.teams.addPlayers}
                </Button>
              </div>
            </section>
          );
        })}
      </div>

      {/*
        La banca: los anotados que todavía no están en ningún equipo. Se puede
        guardar con gente aquí; esos jugadores salen del partido, y se pregunta
        antes de hacerlo.
      */}
      <Reveal show={waiting.length > 0}>
        <div className="pt-4">
          <div className="rounded-xl border border-dashed border-amber-400/40 bg-amber-400/5 px-4 py-3">
            <p className="text-sm font-medium text-amber-300">
              {fill(t.teams.waiting, { count: waiting.length })}
            </p>
            <p className="text-xs text-muted-foreground">
              {t.teams.waitingLeave}
            </p>
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {waiting.map((player) => (
                <li
                  key={player.id}
                  data-flip-id={`player-${player.id}`}
                  className="flex items-center gap-1.5 rounded-full border border-border/70 bg-background/50 px-2 py-0.5 text-xs"
                >
                  <PlayerAvatar player={player} className="size-5" />
                  {player.firstName}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Reveal>

      <Reveal show={blocker !== null}>
        <p className="pt-4 text-sm text-amber-300">{blocker}</p>
      </Reveal>

      <DialogFooter className="mt-4 justify-between">
        <Button variant="ghost" disabled={save.pending} onClick={onCancel}>
          {t.common.cancel}
        </Button>
        <Button
          disabled={!ready || save.pending}
          onClick={() =>
            waiting.length > 0 ? setConfirmingLeave(true) : void save.run()
          }
        >
          {save.pending ? <Spinner /> : <Icon icon={UserGroupIcon} />}
          {t.teams.manualSave}
        </Button>
      </DialogFooter>

      <ConfirmDialog
        open={confirmingLeave}
        onOpenChange={setConfirmingLeave}
        tone="default"
        title={fill(t.teams.leaveTitle, { count: waiting.length })}
        description={t.teams.leaveLine}
        confirmLabel={t.teams.leaveConfirm}
        pending={save.pending}
        onConfirm={() => void save.run().finally(() => setConfirmingLeave(false))}
      />

      {picking !== null ? (
        <PickForSide
          open
          onOpenChange={(next) => !next && setPicking(null)}
          squad={squad}
          sides={sides}
          accents={accents}
          sideName={sideName}
          index={picking}
          onConfirm={(ids) => {
            const index = picking;
            setPicking(null);
            addTo(index, ids);
          }}
        />
      ) : null}
    </div>
  );
}

/**
 * Quiénes van en este equipo.
 *
 * Se ofrece toda la alineación, no solo la banca: elegir a alguien que está en
 * otro equipo lo cambia, que es la mitad de lo que se pide y si no obligaría a
 * sacarlo primero de ese equipo. Cada uno muestra dónde está, con un chip del
 * color de ese equipo, y elegirlo pregunta antes, porque sacar a alguien de un
 * equipo no es lo mismo que ponerlo en uno.
 */
function PickForSide({
  open,
  onOpenChange,
  squad,
  sides,
  accents,
  sideName,
  index,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  squad: Player[];
  sides: Side[];
  accents: string[];
  sideName: (index: number) => string;
  index: number;
  onConfirm: (ids: string[]) => void;
}) {
  const { t } = useLocale();
  const [chosen, setChosen] = useState<string[]>([]);

  /** Alguien de otro equipo, esperando la respuesta a la pregunta. */
  const [asking, setAsking] = useState<{ player: Player; from: number } | null>(
    null,
  );

  // Ya están en este equipo: se muestran marcados y no hace falta marcarlos.
  const mine = sides[index]?.playerIds ?? [];

  /** En qué otro equipo está alguien, o -1 si está en la banca. */
  const sideOf = (id: string) =>
    sides.findIndex((side, at) => at !== index && side.playerIds.includes(id));

  const toggle = (id: string) => {
    if (chosen.includes(id)) {
      setChosen((prev) => prev.filter((one) => one !== id));
      return;
    }

    const from = sideOf(id);
    const player = squad.find((one) => one.id === id);
    if (from >= 0 && player) {
      setAsking({ player, from });
      return;
    }

    setChosen((prev) => [...prev, id]);
  };

  const team = sideName(index);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{team}</DialogTitle>
          <DialogDescription>{t.teams.pickForSide}</DialogDescription>
        </DialogHeader>

        <PlayerPicker
          players={squad}
          selected={chosen}
          onToggle={toggle}
          lockedIds={mine}
          noteFor={(player) => {
            const from = sideOf(player.id);
            if (from < 0) return null;

            return (
              <span
                className="max-w-[9rem] truncate rounded-full border px-2 py-0.5 text-[0.6875rem] font-medium"
                style={{
                  color: accents[from],
                  borderColor: `${accents[from]}55`,
                  backgroundColor: `${accents[from]}14`,
                }}
              >
                {fill(t.teams.onTeam, { team: sideName(from) })}
              </span>
            );
          }}
          className="max-h-80"
        />

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {t.common.cancel}
          </Button>
          <Button
            disabled={chosen.length === 0}
            onClick={() => onConfirm(chosen)}
          >
            {fill(t.teams.addCount, { count: chosen.length })}
          </Button>
        </DialogFooter>
      </DialogContent>

      <ConfirmDialog
        open={asking !== null}
        onOpenChange={(next) => !next && setAsking(null)}
        tone="default"
        title={fill(t.teams.alreadyTitle, {
          name: asking?.player.firstName ?? "",
        })}
        description={fill(t.teams.alreadyLine, {
          from: asking ? sideName(asking.from) : "",
          team,
        })}
        confirmLabel={t.teams.alreadyConfirm}
        onConfirm={() => {
          if (asking) setChosen((prev) => [...prev, asking.player.id]);
          setAsking(null);
        }}
      />
    </Dialog>
  );
}
