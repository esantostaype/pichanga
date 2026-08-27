import "server-only";

import { and, asc, desc, eq, inArray, isNotNull, sql } from "drizzle-orm";

import { DEFAULT_MATCH_DURATION_MS } from "@/lib/constants";
import type { MatchInput, PlaceInput, PlayerInput } from "@/lib/validators";
import type { Match, MatchSummary, Place, Player, Recurrence } from "@/types";
import { db } from "./index";
import { matchPlayers, matches, places, players } from "./schema";
import type { MatchRow, PlaceRow, PlayerRow } from "./schema";

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

const toPlace = (row: PlaceRow | null): Place | null =>
  row
    ? {
        id: row.id,
        name: row.name,
        address: row.address,
        googlePlaceId: row.googlePlaceId,
        mapsUrl: row.mapsUrl,
        lat: row.lat,
        lng: row.lng,
        createdAt: row.createdAt.getTime(),
      }
    : null;

/** Rows written before the column existed fall back to a default length. */
const endOf = (row: { playedAt: Date; endsAt: Date | null }) =>
  row.endsAt?.getTime() ?? row.playedAt.getTime() + DEFAULT_MATCH_DURATION_MS;

const toMatch = (
  row: MatchRow,
  place: PlaceRow | null,
  lineup: Array<{ player: PlayerRow }>,
): Match => ({
  id: row.id,
  playedAt: row.playedAt.getTime(),
  endsAt: endOf(row),
  place: toPlace(place),
  recurrence: (row.recurrence as Recurrence | null) ?? null,
  seriesId: row.seriesId,
  createdAt: row.createdAt.getTime(),
  players: lineup.map((entry) => toPlayer(entry.player)),
});

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * A match counts as current until its final whistle, not until midnight: at
 * 21:05 an 20:00-21:00 fixture is over and the next one takes the pitch.
 */
const stillRunning = (at: number) =>
  sql`coalesce(${matches.endsAt}, ${matches.playedAt} + ${DEFAULT_MATCH_DURATION_MS}) > ${at}`;

/* -------------------------------------------------------------------------- */
/*                                   places                                   */
/* -------------------------------------------------------------------------- */

export async function listPlaces(): Promise<Place[]> {
  const rows = await db.select().from(places).orderBy(asc(places.name));
  return rows.map((row) => toPlace(row)!);
}

export async function createPlace(input: PlaceInput): Promise<Place> {
  const [row] = await db
    .insert(places)
    .values({
      name: input.name,
      address: input.address ?? null,
      googlePlaceId: input.googlePlaceId ?? null,
      mapsUrl: input.mapsUrl ?? null,
      lat: input.lat ?? null,
      lng: input.lng ?? null,
    })
    .returning();

  return toPlace(row)!;
}

export async function updatePlace(
  id: string,
  input: PlaceInput,
): Promise<Place | null> {
  const [row] = await db
    .update(places)
    .set({
      name: input.name,
      address: input.address ?? null,
      googlePlaceId: input.googlePlaceId ?? null,
      mapsUrl: input.mapsUrl ?? null,
      lat: input.lat ?? null,
      lng: input.lng ?? null,
    })
    .where(eq(places.id, id))
    .returning();

  return toPlace(row ?? null);
}

export async function deletePlace(id: string): Promise<boolean> {
  const rows = await db.delete(places).where(eq(places.id, id)).returning();
  return rows.length > 0;
}

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
/*                                 recurrence                                 */
/* -------------------------------------------------------------------------- */

/**
 * Rolls every weekly fixture forward when its latest occurrence has passed.
 *
 * Only one occurrence is created per series, jumping straight to the next
 * upcoming date: a fixture nobody opened for months should produce next
 * Wednesday, not thirty back-dated matches. The lineup is carried over.
 *
 * Runs lazily on read. The unique `(series_id, played_at)` index makes it safe
 * for two concurrent requests to attempt the same insert.
 */
async function materializeRecurringMatches(): Promise<void> {
  const now = Date.now();

  const series = await db
    .select({
      seriesId: matches.seriesId,
      latest: sql<number>`max(${matches.playedAt})`,
      latestEnd: sql<number>`max(coalesce(${matches.endsAt}, ${matches.playedAt} + ${DEFAULT_MATCH_DURATION_MS}))`,
    })
    .from(matches)
    .where(isNotNull(matches.seriesId))
    .groupBy(matches.seriesId);

  // Rolls forward the moment the fixture ends, not at midnight.
  const stale = series.filter((row) => Number(row.latestEnd) <= now);
  if (!stale.length) return;

  for (const row of stale) {
    const [source] = await db
      .select()
      .from(matches)
      .where(
        and(
          eq(matches.seriesId, row.seriesId!),
          eq(matches.playedAt, new Date(Number(row.latest))),
        ),
      )
      .limit(1);

    // The series may have been switched back to a one-off in the meantime.
    if (!source || source.recurrence !== "weekly") continue;

    // Keeps the fixture's own length when shifting it forward.
    const duration = endOf(source) - source.playedAt.getTime();

    let next = source.playedAt.getTime();
    while (next + duration <= now) next += WEEK_MS;

    try {
      const [created] = await db
        .insert(matches)
        .values({
          playedAt: new Date(next),
          endsAt: new Date(next + duration),
          placeId: source.placeId,
          recurrence: source.recurrence,
          seriesId: source.seriesId,
        })
        .returning();

      const lineup = await db
        .select({ playerId: matchPlayers.playerId, slot: matchPlayers.slot })
        .from(matchPlayers)
        .where(eq(matchPlayers.matchId, source.id))
        .orderBy(asc(matchPlayers.slot));

      if (lineup.length) {
        await db.insert(matchPlayers).values(
          lineup.map((entry) => ({
            matchId: created.id,
            playerId: entry.playerId,
            slot: entry.slot,
          })),
        );
      }
    } catch (error) {
      // Another request won the race and already created this occurrence.
      if (!/UNIQUE constraint failed/i.test(String(error))) throw error;
    }
  }
}

/* -------------------------------------------------------------------------- */
/*                                   matches                                  */
/* -------------------------------------------------------------------------- */

export async function listMatches(): Promise<MatchSummary[]> {
  await materializeRecurringMatches();

  const rows = await db
    .select({
      match: matches,
      place: places,
      playerCount: sql<number>`count(${matchPlayers.playerId})`,
    })
    .from(matches)
    .leftJoin(places, eq(places.id, matches.placeId))
    .leftJoin(matchPlayers, eq(matchPlayers.matchId, matches.id))
    .groupBy(matches.id)
    .orderBy(desc(matches.playedAt));

  return rows.map((row) => ({
    id: row.match.id,
    playedAt: row.match.playedAt.getTime(),
    endsAt: endOf(row.match),
    place: toPlace(row.place),
    recurrence: (row.match.recurrence as Recurrence | null) ?? null,
    seriesId: row.match.seriesId,
    createdAt: row.match.createdAt.getTime(),
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

async function loadPlace(placeId: string | null) {
  if (!placeId) return null;
  const [row] = await db.select().from(places).where(eq(places.id, placeId));
  return row ?? null;
}

export async function getMatch(id: string): Promise<Match | null> {
  const [row] = await db.select().from(matches).where(eq(matches.id, id));
  if (!row) return null;

  return toMatch(row, await loadPlace(row.placeId), await loadLineup(id));
}

/**
 * The match that owns the main screen: the one being played right now, or else
 * the closest one still to come. If everything is over we show the most recent
 * one so the pitch is not empty.
 */
export async function getNextMatch(): Promise<Match | null> {
  await materializeRecurringMatches();

  const [upcoming] = await db
    .select()
    .from(matches)
    .where(stillRunning(Date.now()))
    .orderBy(asc(matches.playedAt))
    .limit(1);

  const row =
    upcoming ??
    (await db.select().from(matches).orderBy(desc(matches.playedAt)).limit(1))[0];

  if (!row) return null;

  return toMatch(row, await loadPlace(row.placeId), await loadLineup(row.id));
}

export async function createMatch(input: MatchInput): Promise<Match> {
  const [row] = await db
    .insert(matches)
    .values({
      playedAt: new Date(input.playedAt),
      endsAt: new Date(input.endsAt),
      placeId: input.placeId ?? null,
      recurrence: input.recurrence ?? null,
      // A recurring fixture opens its own series; occurrences inherit the id.
      seriesId: input.recurrence ? crypto.randomUUID() : null,
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

  return toMatch(row, await loadPlace(row.placeId), await loadLineup(row.id));
}

export async function updateMatch(
  id: string,
  input: MatchInput,
): Promise<Match | null> {
  const [current] = await db.select().from(matches).where(eq(matches.id, id));
  if (!current) return null;

  // Turning recurrence on opens a series; turning it off detaches this match
  // so the materializer stops rolling it forward.
  const seriesId = input.recurrence
    ? (current.seriesId ?? crypto.randomUUID())
    : null;

  const [row] = await db
    .update(matches)
    .set({
      playedAt: new Date(input.playedAt),
      endsAt: new Date(input.endsAt),
      placeId: input.placeId ?? null,
      recurrence: input.recurrence ?? null,
      seriesId,
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

  return toMatch(row, await loadPlace(row.placeId), await loadLineup(id));
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

  return toMatch(
    match,
    await loadPlace(match.placeId),
    await loadLineup(matchId),
  );
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

export async function placeExists(id: string | null | undefined) {
  if (!id) return true;
  const [row] = await db
    .select({ id: places.id })
    .from(places)
    .where(eq(places.id, id));
  return !!row;
}
