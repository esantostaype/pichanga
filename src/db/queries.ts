import "server-only";

import { and, asc, desc, eq, inArray, isNotNull, lte, sql } from "drizzle-orm";
import { cache } from "react";

import { DEFAULT_MATCH_DURATION_MS, MATCH_GRACE_MS } from "@/lib/constants";
import { matchSlug } from "@/lib/date";
import type {
  MatchInput,
  MediaInput,
  PlaceInput,
  PlayerInput,
} from "@/lib/validators";
import type {
  Match,
  MatchMedia,
  MatchSummary,
  Place,
  Player,
  Recurrence,
} from "@/types";
import { db } from "./index";
import { matchMedia, matchPlayers, matches, places, players } from "./schema";
import type { MatchMediaRow, MatchRow, PlaceRow, PlayerRow } from "./schema";

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
        price: row.price,
        lat: row.lat,
        lng: row.lng,
        createdAt: row.createdAt.getTime(),
      }
    : null;

/** Rows written before the column existed fall back to a default length. */
const endOf = (row: { playedAt: Date; endsAt: Date | null }) =>
  row.endsAt?.getTime() ?? row.playedAt.getTime() + DEFAULT_MATCH_DURATION_MS;

const toMedia = (row: MatchMediaRow): MatchMedia => ({
  id: row.id,
  matchId: row.matchId,
  kind: row.kind === "video" ? "video" : "image",
  url: row.url,
  thumbnailUrl: row.thumbnailUrl,
  width: row.width,
  height: row.height,
  createdAt: row.createdAt.getTime(),
});

const toMatch = (
  row: MatchRow,
  place: PlaceRow | null,
  lineup: Array<{ player: PlayerRow; paidAt: Date | null }>,
): Match => ({
  id: row.id,
  playedAt: row.playedAt.getTime(),
  endsAt: endOf(row),
  place: toPlace(place),
  organizerId: row.organizerId,
  recurrence: (row.recurrence as Recurrence | null) ?? null,
  seriesId: row.seriesId,
  createdAt: row.createdAt.getTime(),
  players: lineup.map((entry) => toPlayer(entry.player)),
  /**
   * The organizer is always in here. They pay the venue, so their share is
   * settled by definition -- and deriving it beats writing a `paid_at` that
   * would be left behind the day somebody else takes the match over.
   */
  paidPlayerIds: lineup
    .filter(
      (entry) => entry.paidAt !== null || entry.player.id === row.organizerId,
    )
    .map((entry) => entry.player.id),
});

/**
 * The organizer plays: they are forced into the lineup and put first, which is
 * the slot the formation reserves for the centre of the pitch.
 */
const withOrganizerFirst = (
  playerIds: string[],
  organizerId: string | null | undefined,
) =>
  organizerId
    ? [organizerId, ...playerIds.filter((id) => id !== organizerId)]
    : playerIds;

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** Final whistle, real or assumed, as a SQL expression. */
const endsAtSql = sql`coalesce(${matches.endsAt}, ${matches.playedAt} + ${DEFAULT_MATCH_DURATION_MS})`;

/** Not over yet: being played right now, or still to come. */
const stillRunning = (at: number) => sql`${endsAtSql} > ${at}`;

/** Over, but recently enough that the rental may still be outstanding. */
const withinGrace = (at: number) =>
  sql`${endsAtSql} <= ${at} and ${endsAtSql} > ${at - MATCH_GRACE_MS}`;

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
      price: input.price ?? null,
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
      price: input.price ?? null,
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
export const materializeRecurringMatches = cache(_materializeRecurringMatches);

/**
 * Wrapped in `cache` above: `listMatches`, `getNextMatch` and
 * `getMatchBySlug` all roll the fixtures forward, and one page calls all
 * three. Deduplicated per request, that is two fewer round trips to a database
 * that lives on the other side of the network.
 */
async function _materializeRecurringMatches(): Promise<void> {
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
          organizerId: source.organizerId,
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
      // Same rule as `toMatch`: the organizer is counted as settled.
      paidCount: sql<number>`count(case when ${matchPlayers.paidAt} is not null or ${matchPlayers.playerId} = ${matches.organizerId} then 1 end)`,
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
    organizerId: row.match.organizerId,
    recurrence: (row.match.recurrence as Recurrence | null) ?? null,
    seriesId: row.match.seriesId,
    createdAt: row.match.createdAt.getTime(),
    playerCount: Number(row.playerCount ?? 0),
    paidCount: Number(row.paidCount ?? 0),
  }));
}

async function loadLineup(matchId: string) {
  return db
    .select({
      player: players,
      slot: matchPlayers.slot,
      paidAt: matchPlayers.paidAt,
    })
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

/**
 * Looks a match up by the slug in its URL, e.g. `sep-2-2026`.
 *
 * Compared as strings rather than as an epoch range: the slug is already the
 * calendar day in the pitch's zone, and matching it that way keeps every
 * timezone edge out of the query. The fixture list is small enough that
 * scanning it costs nothing.
 */
export async function getMatchBySlug(slug: string): Promise<Match | null> {
  await materializeRecurringMatches();

  const rows = await db
    .select({ id: matches.id, playedAt: matches.playedAt })
    .from(matches)
    .orderBy(asc(matches.playedAt));

  const found = rows.find((row) => matchSlug(row.playedAt.getTime()) === slug);
  return found ? getMatch(found.id) : null;
}

export async function getMatch(id: string): Promise<Match | null> {
  const [row] = await db.select().from(matches).where(eq(matches.id, id));
  if (!row) return null;

  return toMatch(row, await loadPlace(row.placeId), await loadLineup(id));
}

/**
 * The match that owns the main screen, in priority order:
 *
 *  1. One being played right now.
 *  2. One that finished less than three days ago. The rental gets collected
 *     after the whistle, so the lineup stays up while somebody still owes
 *     their share -- that is what MATCH_GRACE_MS buys.
 *  3. The closest one still to come.
 *  4. Failing all that, the last one played, so the pitch is never empty.
 *
 * A live match jumps the queue on purpose: if the next fixture kicks off while
 * the previous one is still settling up, the ball beats the bookkeeping.
 */
export async function getNextMatch(): Promise<Match | null> {
  await materializeRecurringMatches();

  const now = Date.now();

  const live = await db
    .select()
    .from(matches)
    .where(and(lte(matches.playedAt, new Date(now)), stillRunning(now)))
    .orderBy(asc(matches.playedAt))
    .limit(1);

  const settling = live.length
    ? []
    : await db
        .select()
        .from(matches)
        .where(withinGrace(now))
        .orderBy(desc(matches.playedAt))
        .limit(1);

  const upcoming =
    live.length || settling.length
      ? []
      : await db
          .select()
          .from(matches)
          .where(stillRunning(now))
          .orderBy(asc(matches.playedAt))
          .limit(1);

  const row =
    live[0] ??
    settling[0] ??
    upcoming[0] ??
    (await db.select().from(matches).orderBy(desc(matches.playedAt)).limit(1))[0];

  if (!row) return null;

  return toMatch(row, await loadPlace(row.placeId), await loadLineup(row.id));
}

export type PaidResult =
  | { ok: true; match: Match }
  /** The player is not in this lineup. */
  | { ok: false; reason: "missing" }
  /** The organizer's share cannot be taken back. */
  | { ok: false; reason: "organizer" };

/**
 * Marks one player's share of the rental as settled, or unsettles it. Admin
 * only: it is the organizer's ledger, and there is no per-person identity to
 * stop somebody ticking their own name.
 */
export async function setPlayerPaid(
  matchId: string,
  playerId: string,
  paid: boolean,
): Promise<PaidResult> {
  const [match] = await db.select().from(matches).where(eq(matches.id, matchId));
  if (!match) return { ok: false, reason: "missing" };

  if (match.organizerId === playerId) {
    // Taking it back is refused outright, and granting it writes nothing: the
    // role already implies it, and a stored `paid_at` would outlive the role.
    // Somebody handed the match over and their predecessor would still read as
    // settled, having never paid a thing.
    if (!paid) return { ok: false, reason: "organizer" };

    const settled = await getMatch(matchId);
    return settled ? { ok: true, match: settled } : { ok: false, reason: "missing" };
  }

  const updated = await db
    .update(matchPlayers)
    .set({ paidAt: paid ? new Date() : null })
    .where(
      and(
        eq(matchPlayers.matchId, matchId),
        eq(matchPlayers.playerId, playerId),
      ),
    )
    .returning();

  if (!updated.length) return { ok: false, reason: "missing" };

  const full = await getMatch(matchId);
  return full ? { ok: true, match: full } : { ok: false, reason: "missing" };
}

/* -------------------------------------------------------------------------- */
/*                                match media                                 */
/* -------------------------------------------------------------------------- */

export async function listMatchMedia(matchId: string): Promise<MatchMedia[]> {
  const rows = await db
    .select()
    .from(matchMedia)
    .where(eq(matchMedia.matchId, matchId))
    .orderBy(desc(matchMedia.createdAt));

  return rows.map(toMedia);
}

export async function addMatchMedia(
  matchId: string,
  input: MediaInput,
): Promise<MatchMedia | null> {
  const [match] = await db.select().from(matches).where(eq(matches.id, matchId));
  if (!match) return null;

  const [row] = await db
    .insert(matchMedia)
    .values({
      matchId,
      publicId: input.publicId,
      url: input.url,
      kind: input.kind,
      thumbnailUrl: input.thumbnailUrl ?? null,
      width: input.width ?? null,
      height: input.height ?? null,
    })
    .returning();

  return toMedia(row);
}

/** Returns the Cloudinary id so the caller can delete the file itself. */
export async function deleteMatchMedia(
  matchId: string,
  mediaId: string,
): Promise<{ publicId: string; kind: "image" | "video" } | null> {
  const [row] = await db
    .delete(matchMedia)
    .where(and(eq(matchMedia.matchId, matchId), eq(matchMedia.id, mediaId)))
    .returning();

  if (!row) return null;

  return {
    publicId: row.publicId,
    kind: row.kind === "video" ? "video" : "image",
  };
}

/**
 * Just the id of the match the front page would show.
 *
 * Same choice as `getNextMatch`, without the place and the lineup: a pinned
 * page needs it only to know whether a row in the drawer should link to "/".
 */
export async function getHomeMatchId(): Promise<string | null> {
  await materializeRecurringMatches();

  const now = Date.now();
  const id = { id: matches.id };

  const live = await db
    .select(id)
    .from(matches)
    .where(and(lte(matches.playedAt, new Date(now)), stillRunning(now)))
    .orderBy(asc(matches.playedAt))
    .limit(1);
  if (live[0]) return live[0].id;

  const settling = await db
    .select(id)
    .from(matches)
    .where(withinGrace(now))
    .orderBy(desc(matches.playedAt))
    .limit(1);
  if (settling[0]) return settling[0].id;

  const upcoming = await db
    .select(id)
    .from(matches)
    .where(stillRunning(now))
    .orderBy(asc(matches.playedAt))
    .limit(1);
  if (upcoming[0]) return upcoming[0].id;

  const last = await db
    .select(id)
    .from(matches)
    .orderBy(desc(matches.playedAt))
    .limit(1);

  return last[0]?.id ?? null;
}

export async function createMatch(input: MatchInput): Promise<Match> {
  const [row] = await db
    .insert(matches)
    .values({
      playedAt: new Date(input.playedAt),
      endsAt: new Date(input.endsAt),
      placeId: input.placeId ?? null,
      organizerId: input.organizerId ?? null,
      recurrence: input.recurrence ?? null,
      // A recurring fixture opens its own series; occurrences inherit the id.
      seriesId: input.recurrence ? crypto.randomUUID() : null,
    })
    .returning();

  const lineup = withOrganizerFirst(input.playerIds, input.organizerId);

  if (lineup.length) {
    await db.insert(matchPlayers).values(
      lineup.map((playerId, index) => ({
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
      organizerId: input.organizerId ?? null,
      recurrence: input.recurrence ?? null,
      seriesId,
    })
    .where(eq(matches.id, id))
    .returning();

  if (!row) return null;

  await db.delete(matchPlayers).where(eq(matchPlayers.matchId, id));

  const lineup = withOrganizerFirst(input.playerIds, input.organizerId);

  if (lineup.length) {
    await db.insert(matchPlayers).values(
      lineup.map((playerId, index) => ({
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
