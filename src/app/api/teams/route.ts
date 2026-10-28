import { createSavedTeam, listSavedTeams } from "@/db/queries";
import { messages } from "@/i18n/server";
import { REALTIME } from "@/lib/constants";
import { fail, json, readJson, route } from "@/lib/http";
import { broadcast } from "@/lib/pusher/server";
import { savedTeamInputSchema } from "@/lib/validators";

export const dynamic = "force-dynamic";

/** Los equipos guardados, para usarlos de semana en semana. */
export async function GET(request: Request) {
  const demo = new URL(request.url).searchParams.get("demo") === "1";
  return route(async () => json(await listSavedTeams(demo)));
}

/** Crea un equipo guardado. Como las canchas, necesita la sesión (o la demo). */
export async function POST(request: Request) {
  return route(async () => {
    const input = await readJson(request, savedTeamInputSchema);
    const team = await createSavedTeam(input);

    if (!team) return fail((await messages()).savedTeamTaken, 409);

    await broadcast(REALTIME.events.savedTeamsChanged, { id: team.id });

    return json(team, 201);
  });
}
