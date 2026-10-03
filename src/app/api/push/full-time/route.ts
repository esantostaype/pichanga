import { pushFullTime } from "@/db/push-night";
import { getMatchLive } from "@/db/queries";
import { fail, json, route } from "@/lib/http";
import { verifyQStash } from "@/lib/push";

export const dynamic = "force-dynamic";

/**
 * QStash calling back at the second a game's clock runs out.
 *
 * Reading the night closes the game if nobody has (`closeOverdueGames`), and
 * then every phone following the match is told. Anything not signed by QStash
 * is turned away: this is the one door that sends notifications on its own.
 */
export async function POST(request: Request) {
  return route(async () => {
    const raw = await request.text();

    if (!verifyQStash(request.headers.get("upstash-signature"), raw)) {
      return fail("Bad signature", 401);
    }

    const { matchId, gameId } = JSON.parse(raw) as {
      matchId?: string;
      gameId?: string;
    };
    if (!matchId || !gameId) return fail("Bad body", 422);

    // Blows the whistle if the game is still running past its time.
    const live = await getMatchLive(matchId);
    const game = live.games.find((one) => one.id === gameId);
    if (!game || game.endedAt === null) return json({ sent: false });

    await pushFullTime(matchId, gameId);
    return json({ sent: true });
  });
}
