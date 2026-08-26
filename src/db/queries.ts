import "server-only";

import { and, asc, desc, eq, gte, inArray, sql } from "drizzle-orm";

import type { MatchInput, PlayerInput } from "@/lib/validators";
import type { Match, MatchSummary, Player } from "@/types";
import { db } from "./index";
import { matchPlayers, matches, players } from "./schema";
import type { MatchRow, PlayerRow } from "./schema";

/* -------------------------------------------------------------------------- */
/*                                  mappers                                   */
/* -------------------------------------------------------------------------- */

const toPlayer = (row: PlayerRow): Player => ({
  id: row.id,
  firstName: row.firstName,
  lastName: row.lastName,
  area: row.area,
  photoUrl: row.photoUrl,
  photoPublicId: row.photoPublicId,
  createdAt: row.createdAt.getTime(),
});

const toMatch = (
  row: MatchRow,
  lineup: Array<{ player: PlayerRow }>,
): Match => ({
  id: row.id,
  playedAt: row.playedAt.getTime(),
  location: row.location,
  createdAt: row.createdAt.getTime(),
  players: lineup.map((entry) => toPlayer(entry.player)),
});

/** Start of today: a match stays "upcoming" for the whole of its day. */
const startOfToday = () => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now;
};

/* -------------------------------------------------------------------------- */
/*                                   players                                  */
/* -------------------------------------------------------------------------- */

export async function listPlayers(): Promise<Player[]> {
  const rows = await db
    .select()
    .from(players)
    .orderBy(asc(players.firstName), asc(players.lastName));

  return rows.map(toPlayer);
}

export async function getPlayer(id: string): Promise<Player | null> {
  const [row] = await db.select().from(players).where(eq(players.id, id));
  return row ? toPlayer(row) : null;
}

export async function createPlayer(input: PlayerInput): Promise<Player> {
  const [row] = await db
    .insert(players)
    .values({
      firstName: input.firstName,
      lastName: input.lastName,
      area: input.area,
      photoUrl: input.photoUrl ?? null,
      photoPublicId: input.photoPublicId ?? null,
    })
    .returning();

  return toPlayer(row);
}

export async function updatePlayer(
  id: string,
  input: PlayerInput,
): Promise<Player | null> {
  const [row] = await db
    .update(players)
    .set({
      firstName: input.firstName,
      lastName: input.lastName,
      area: input.area,
      photoUrl: input.photoUrl ?? null,
      photoPublicId: input.photoPublicId ?? null,
    })
    .where(eq(players.id, id))
    .returning();

  return row ? toPlayer(row) : null;
}

export async function deletePlayer(id: string): Promise<Player | null> {
  const [row] = await db.delete(players).where(eq(players.id, id)).returning();
  return row ? toPlayer(row) : null;
}

/* -------------------------------------------------------------------------- */
/*                                   matches                                  */
/* -------------------------------------------------------------------------- */

export async function listMatches(): Promise<MatchSummary[]> {
  const rows = await db
    .select({
      id: matches.id,
      playedAt: matches.playedAt,
      location: matches.location,
      createdAt: matches.createdAt,
      playerCount: sql<number>`count(${matchPlayers.playerId})`,
    })
    .from(matches)
    .leftJoin(matchPlayers, eq(matchPlayers.matchId, matches.id))
    .groupBy(matches.id)
    .orderBy(desc(matches.playedAt));

  return rows.map((row) => ({
    id: row.id,
    playedAt: row.playedAt.getTime(),
    location: row.location,
    createdAt: row.createdAt.getTime(),
    playerCount: Number(row.playerCount ?? 0),
  }));
}

async function loadLineup(matchId: string) {
  return db
    .select({ player: players, slot: matchPlayers.slot })
    .from(matchPlayers)
    .innerJoin(players, eq(players.id, matchPlayers.playerId))
    .where(eq(matchPlayers.matchId, matchId))
    .orderBy(asc(matchPlayers.slot), asc(matchPlayers.createdAt));
}

export async function getMatch(id: string): Promise<Match | null> {
  const [row] = await db.select().from(matches).where(eq(matches.id, id));
  if (!row) return null;

  return toMatch(row, await loadLineup(id));
}

/**
 * The match that owns the main screen: the closest one to be played. If there
 * is no upcoming match we show the most recent one so the pitch is not empty.
 */
export async function getNextMatch(): Promise<Match | null> {
  const [upcoming] = await db
    .select()
    .from(matches)
    .where(gte(matches.playedAt, startOfToday()))
    .orderBy(asc(matches.playedAt))
    .limit(1);

  const row =
    upcoming ??
    (
      await db
        .select()
        .from(matches)
        .orderBy(desc(matches.playedAt))
        .limit(1)
    )[0];

  if (!row) return null;

  return toMatch(row, await loadLineup(row.id));
}

export async function createMatch(input: MatchInput): Promise<Match> {
  const [row] = await db
    .insert(matches)
    .values({
      playedAt: new Date(input.playedAt),
      location: input.location?.trim() || null,
    })
    .returning();

  if (input.playerIds.length) {
    await db.insert(matchPlayers).values(
      input.playerIds.map((playerId, index) => ({
        matchId: row.id,
        playerId,
        slot: index,
      })),
    );
  }

  return toMatch(row, await loadLineup(row.id));
}

export async function updateMatch(
  id: string,
  input: MatchInput,
): Promise<Match | null> {
  const [row] = await db
    .update(matches)
    .set({
      playedAt: new Date(input.playedAt),
      location: input.location?.trim() || null,
    })
    .where(eq(matches.id, id))
    .returning();

  if (!row) return null;

  await db.delete(matchPlayers).where(eq(matchPlayers.matchId, id));

  if (input.playerIds.length) {
    await db.insert(matchPlayers).values(
      input.playerIds.map((playerId, index) => ({
        matchId: id,
        playerId,
        slot: index,
      })),
    );
  }

  return toMatch(row, await loadLineup(id));
}

export async function deleteMatch(id: string): Promise<boolean> {
  const rows = await db.delete(matches).where(eq(matches.id, id)).returning();
  return rows.length > 0;
}

/* -------------------------------------------------------------------------- */
/*                                   lineup                                   */
/* -------------------------------------------------------------------------- */

/** Appends players to the lineup, ignoring anyone already signed up. */
export async function addPlayersToMatch(
  matchId: string,
  playerIds: string[],
): Promise<Match | null> {
  const [match] = await db.select().from(matches).where(eq(matches.id, matchId));
  if (!match) return null;

  const existing = await db
    .select({ playerId: matchPlayers.playerId, slot: matchPlayers.slot })
    .from(matchPlayers)
    .where(eq(matchPlayers.matchId, matchId));

  const taken = new Set(existing.map((e) => e.playerId));
  const nextSlot = existing.reduce((max, e) => Math.max(max, e.slot + 1), 0);
  const fresh = playerIds.filter((id) => !taken.has(id));

  if (fresh.length) {
    await db.insert(matchPlayers).values(
      fresh.map((playerId, index) => ({
        matchId,
        playerId,
        slot: nextSlot + index,
      })),
    );
  }

  return toMatch(match, await loadLineup(matchId));
}

export async function removePlayerFromMatch(
  matchId: string,
  playerId: string,
): Promise<Match | null> {
  await db
    .delete(matchPlayers)
    .where(
      and(
        eq(matchPlayers.matchId, matchId),
        eq(matchPlayers.playerId, playerId),
      ),
    );

  return getMatch(matchId);
}

/** Checks every id exists before writing the lineup. */
export async function assertPlayersExist(ids: string[]): Promise<boolean> {
  if (!ids.length) return true;

  const rows = await db
    .select({ id: players.id })
    .from(players)
    .where(inArray(players.id, ids));

  return rows.length === new Set(ids).size;
}
