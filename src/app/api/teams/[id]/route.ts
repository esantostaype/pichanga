import { deleteSavedTeam, updateSavedTeam } from "@/db/queries";
import { messages } from "@/i18n/server";
import { REALTIME } from "@/lib/constants";
import { fail, json, readJson, route } from "@/lib/http";
import { broadcast } from "@/lib/pusher/server";
import { savedTeamInputSchema } from "@/lib/validators";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

/**
 * Edita un equipo guardado. Los partidos ya armados con él no cambian: al
 * usarlo en un partido se copió, así que una noche jugada queda como fue.
 */
export async function PATCH(request: Request, { params }: Context) {
  return route(async () => {
    const { id } = await params;
    const input = await readJson(request, savedTeamInputSchema);
    const team = await updateSavedTeam(id, input);

    if (team === "taken") return fail((await messages()).savedTeamTaken, 409);
    if (!team) return fail((await messages()).savedTeamNotFound, 404);

    await broadcast(REALTIME.events.savedTeamsChanged, { id });

    return json(team);
  });
}

/** Borra un equipo guardado. Tampoco toca los partidos donde se usó. */
export async function DELETE(_request: Request, { params }: Context) {
  return route(async () => {
    const { id } = await params;
    const removed = await deleteSavedTeam(id);

    if (!removed) return fail((await messages()).savedTeamNotFound, 404);

    await broadcast(REALTIME.events.savedTeamsChanged, { id });

    return json({ id });
  });
}
