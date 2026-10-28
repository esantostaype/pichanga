"use client";

import {
  Delete02Icon,
  PencilEdit02Icon,
  PlusSignIcon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons";
import gsap from "gsap";
import { useLayoutEffect, useRef, useState } from "react";

import { TeamCrest } from "@/components/matches/team-crest";
import { PlayerAvatar } from "@/components/players/player-avatar";
import { useLocale } from "@/components/providers/locale-provider";
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
import { useAction } from "@/hooks/use-action";
import { fill } from "@/i18n/dictionaries";
import { EASE } from "@/lib/ease";
import type { SavedTeam } from "@/types";
import { SavedTeamFormDialog } from "./saved-team-form-dialog";

/** Cuántas caras se muestran por equipo antes del "+N". */
const FACES = 7;

/**
 * Los equipos guardados, como los jugadores o las canchas: una lista para
 * crearlos, editarlos y borrarlos, y usarlos después en cualquier partido.
 *
 * Cualquiera puede verlos; cambiarlos necesita la sesión (o estar en la demo),
 * como las canchas.
 *
 * Nada aparece ni desaparece de golpe: un equipo nuevo entra creciendo, uno
 * borrado se encoge antes de irse, y los demás se acomodan deslizándose.
 */
export function SavedTeamsDrawer({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useLocale();
  const { savedTeams, players, isAdmin, deleteSavedTeams } = usePichanga();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SavedTeam | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string[]>([]);

  const byId = new Map(players.map((player) => [player.id, player]));

  /* ----------------------------- el movimiento ---------------------------- */

  const list = useRef<HTMLUListElement>(null);
  /** Los equipos que ya estaban en pantalla, para reconocer a los nuevos. */
  const known = useRef<Set<string> | null>(null);
  const signature = savedTeams.map((team) => team.id).join(",");

  /*
   * Un equipo nuevo crece desde altura cero, así los de abajo se corren
   * suavemente para hacerle lugar. La primera vez no se anima: es la lista que
   * ya había.
   */
  useLayoutEffect(() => {
    const ids = signature ? signature.split(",") : [];
    const before = known.current;
    known.current = new Set(ids);
    if (!before || !list.current) return;

    const arriving = ids
      .filter((id) => !before.has(id))
      .map((id) => list.current?.querySelector(`[data-team="${id}"]`))
      .filter((row): row is Element => !!row);
    if (arriving.length === 0) return;

    gsap.from(arriving, {
      height: 0,
      paddingTop: 0,
      paddingBottom: 0,
      autoAlpha: 0,
      scale: 0.96,
      duration: 0.45,
      ease: EASE,
      clearProps: "height,paddingTop,paddingBottom,opacity,visibility,transform",
    });
  }, [signature]);

  // Al abrir el panel, las filas entran una tras otra.
  useLayoutEffect(() => {
    if (!open || !list.current) return;
    gsap.fromTo(
      list.current.children,
      { autoAlpha: 0, y: 12 },
      {
        autoAlpha: 1,
        y: 0,
        duration: 0.45,
        ease: EASE,
        stagger: 0.05,
        clearProps: "transform,opacity,visibility",
      },
    );
  }, [open]);

  const remove = useAction(async (ids: string[]) => deleteSavedTeams(ids), {
    success: t.savedTeams.deleted,
    onSuccess: () => setPendingDelete([]),
  });

  /**
   * Encoge las filas que se van a borrar hasta altura cero, para que las de
   * abajo suban deslizándose, y recién entonces las borra.
   */
  const confirmDelete = () => {
    const rows = pendingDelete
      .map((id) => list.current?.querySelector(`[data-team="${id}"]`))
      .filter((row): row is Element => !!row);

    if (rows.length === 0) return void remove.run(pendingDelete);

    gsap.to(rows, {
      height: 0,
      paddingTop: 0,
      paddingBottom: 0,
      marginBottom: 0,
      autoAlpha: 0,
      scale: 0.96,
      duration: 0.3,
      ease: "power2.in",
      // Si el borrado falla, las filas vuelven a verse como estaban.
      onComplete: () =>
        void remove
          .run(pendingDelete)
          .finally(() => gsap.set(rows, { clearProps: "all" })),
    });
  };

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{t.savedTeams.title}</SheetTitle>
            <SheetDescription>
              {fill(
                savedTeams.length === 1
                  ? t.savedTeams.countOne
                  : t.savedTeams.count,
                { count: savedTeams.length },
              )}
            </SheetDescription>
          </SheetHeader>

          <SheetBody className="flex flex-col gap-4">
            {isAdmin ? (
              <Button size="sm" onClick={openCreate} className="self-start">
                <Icon icon={PlusSignIcon} size={16} />
                {t.savedTeams.newTeam}
              </Button>
            ) : null}

            {savedTeams.length === 0 ? (
              <EmptyState
                icon={UserGroupIcon}
                title={t.savedTeams.emptyTitle}
                description={t.savedTeams.emptyLine}
              />
            ) : null}

            <ul ref={list} className="space-y-2.5">
              {savedTeams.map((team) => {
                const members = team.playerIds
                  .map((id) => byId.get(id))
                  .filter((one) => one !== undefined);
                const extra = members.length - FACES;

                return (
                  <li
                    key={team.id}
                    data-team={team.id}
                    className="flex items-center gap-3 overflow-hidden rounded-2xl border p-3"
                    style={{
                      borderColor: `${team.accent}55`,
                      backgroundColor: `color-mix(in oklab, ${team.accent} 10%, var(--background))`,
                    }}
                  >
                    <TeamCrest
                      name={team.name}
                      accent={team.accent}
                      badge={team.badge}
                      image={team.crestUrl}
                    />

                    <div className="min-w-0 flex-1">
                      <p className="truncate font-display text-lg uppercase tracking-[0.04em]">
                        {team.name}
                      </p>
                      {members.length === 0 ? (
                        <p className="text-xs text-muted-foreground">
                          {t.savedTeams.noPlayers}
                        </p>
                      ) : (
                        <div className="mt-1 flex items-center">
                          <span className="flex -space-x-2">
                            {members.slice(0, FACES).map((player) => (
                              <PlayerAvatar
                                key={player.id}
                                player={player}
                                className="size-6 ring-2 ring-background"
                              />
                            ))}
                          </span>
                          <span className="ml-2 text-xs text-muted-foreground">
                            {extra > 0
                              ? `+${extra} · `
                              : ""}
                            {fill(t.savedTeams.players, {
                              count: members.length,
                            })}
                          </span>
                        </div>
                      )}
                    </div>

                    {isAdmin ? (
                      <div className="flex shrink-0 gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={fill(t.savedTeams.editName, {
                            name: team.name,
                          })}
                          onClick={() => {
                            setEditing(team);
                            setFormOpen(true);
                          }}
                        >
                          <Icon icon={PencilEdit02Icon} size={15} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={fill(t.savedTeams.deleteName, {
                            name: team.name,
                          })}
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => setPendingDelete([team.id])}
                        >
                          <Icon icon={Delete02Icon} size={15} />
                        </Button>
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </SheetBody>
        </SheetContent>
      </Sheet>

      <SavedTeamFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        team={editing}
      />

      <ConfirmDialog
        open={pendingDelete.length > 0}
        onOpenChange={(next) => !next && setPendingDelete([])}
        title={
          pendingDelete.length > 1
            ? fill(t.savedTeams.deleteMany, { count: pendingDelete.length })
            : t.savedTeams.deleteOne
        }
        description={t.savedTeams.deleteLine}
        pending={remove.pending}
        onConfirm={confirmDelete}
      />
    </>
  );
}
