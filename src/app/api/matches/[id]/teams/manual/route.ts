import { getMatch, getMatchLive, setTeamsManually } from "@/db/queries";
import { messages } from "@/i18n/server";
import { REALTIME } from "@/lib/constants";
import { fail, json, readJson, route } from "@/lib/http";
import { broadcast } from "@/lib/pusher/server";
import { teamsManualInputSchema } from "@/lib/validators";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

/**
 * The sides, arranged by hand.
 *
 * Takes the whole arrangement at once rather than a move at a time. Building a
 * side out of fourteen people one request per player is the tedium this exists
 * to remove, and it also means a half-applied arrangement cannot survive a
 * dropped connection: either all of it lands or none of it does.
 *
 * **Not once a game has been played**, for the reason a redraw is not: the
 * table is kept on these sides.
 *
 * Quien quede sin equipo sale del partido. Es lo mismo que sacar a alguien de
 * la alineación, así que sigue la misma regla: desde que empieza el partido no
 * sale nadie, y se rechaza un armado que deje a alguien fuera. En la demo el
 * reloj no manda, como en todo lo demás.
 */
export async function POST(request: Request, { params }: Context) {
  return route(async () => {
    const { id } = await params;
    const { sides } = await readJson(request, teamsManualInputSchema);

    const current = await getMatch(id);
    if (!current) return fail((await messages()).matchNotFound, 404);

    const live = await getMatchLive(id);
    if (live.games.length > 0) {
      return fail((await messages()).nightStarted, 409);
    }

    const placed = new Set(sides.flatMap((side) => side.playerIds));
    const leavingSomebody = current.players.some((one) => !placed.has(one.id));
    if (leavingSomebody && !current.isDemo && Date.now() >= current.playedAt) {
      return fail((await messages()).lineupLocked, 409);
    }

    const match = await setTeamsManually(id, sides);

    // Solo falla si alguien está repetido o no es del partido, cosa que el
    // formulario no permite armar.
    if (!match) return fail((await messages()).teamsNotInMatch, 422);

    await broadcast(REALTIME.events.lineupChanged, { matchId: id });
    // También quedaron en la lista de equipos guardados.
    await broadcast(REALTIME.events.savedTeamsChanged, { matchId: id });
    // El conteo de jugadores en la tarjeta del partido cambia si sale alguien.
    if (leavingSomebody) {
      await broadcast(REALTIME.events.matchesChanged, { id });
    }

    return json(match);
  });
}
