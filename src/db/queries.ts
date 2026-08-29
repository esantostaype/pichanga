import "server-only";

import {
  and,
  asc,
  desc,
  eq,
  inArray,
  isNotNull,
  isNull,
  lte,
  sql,
} from "drizzle-orm";
import { cache } from "react";

import {
  AREA_IDS,
  DEFAULT_MATCH_DURATION_MS,
  DEFAULT_PITCH_FORMAT,
  MATCH_GRACE_MS,
  TEAM_NAMES,
} from "@/lib/constants";
import { matchSlug } from "@/lib/date";
import type {
  MatchInput,
  MediaInput,
  PlaceInput,
  PlayerInput,
} from "@/lib/validators";
import type {
  Match,
  MatchGame,
  MatchGoal,
  MatchLive,
  MatchMedia,
  MatchSummary,
  Place,
  Player,
  Recurrence,
} from "@/types";
import { db } from "./index";
import { buildStats } from "@/lib/stats";
import type { Stats } from "@/lib/stats";
import { planTeams } from "@/lib/teams";
import {
  matchGames,
  matchGoals,
  matchMedia,
  matchPlayers,
  matchTeams,
  matches,
  places,
  players,
} from "./schema";
import type {
  MatchGameRow,
  MatchGoalRow,
  MatchMediaRow,
  MatchRow,
  MatchTeamRow,
  PlaceRow,
  PlayerRow,
} from "./schema";

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
  position: row.position as Player["position"],
  skills: {
    pace: row.pace,
    stamina: row.stamina,
    finishing: row.finishing,
    passing: row.passing,
    defending: row.defending,
    goalkeeping: row.goalkeeping,
  },
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
        format: row.format,
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
  lineup: Array<{
    player: PlayerRow;
    paidAt: Date | null;
    teamId: string | null;
    isKeeper: boolean;
  }>,
  teams: MatchTeamRow[] = [],
): Match => ({
  id: row.id,
  playedAt: row.playedAt.getTime(),
  endsAt: endOf(row),
  place: toPlace(place),
  organizerId: row.organizerId,
  recurrence: (row.recurrence as Recurrence | null) ?? null,
  seriesId: row.seriesId,
  createdAt: row.createdAt.getTime(),
  isDemo: row.isDemo,
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
  teams: teams.map((team) => {
    const squad = lineup.filter((entry) => entry.teamId === team.id);
    const keeper = squad.find((entry) => entry.isKeeper) ?? null;

    return {
      id: team.id,
      slot: team.slot,
      name: team.name,
      accent: team.accent,
      playerIds: squad.map((entry) => entry.player.id),
      keeperId: keeper?.player.id ?? null,
      // Derived rather than stored: whether the keeper volunteered is a fact
      // about their profile, and it changes the day they change their mind.
      borrowedKeeper: !!keeper && keeper.player.position !== "gk",
    };
  }),
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

/**
 * The venues.
 *
 * `demo` picks which world to read: the sandbox rows or the real ones, never
 * both. Every listing takes the same flag, which is what lets `/demo` run the
 * whole app -- adding, deleting, drawing teams, keeping score -- against rows
 * nobody plays on.
 */
export async function listPlaces(demo = false): Promise<Place[]> {
  const rows = await db
    .select()
    .from(places)
    .where(eq(places.isDemo, demo))
    .orderBy(asc(places.name));
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
      format: input.format ?? null,
      lat: input.lat ?? null,
      lng: input.lng ?? null,
      isDemo: input.isDemo ?? false,
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
      format: input.format ?? null,
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

export async function listPlayers(demo = false): Promise<Player[]> {
  const rows = await db
    .select()
    .from(players)
    .where(eq(players.isDemo, demo))
    .orderBy(asc(players.firstName), asc(players.lastName));

  return rows.map(toPlayer);
}

export async function getPlayer(id: string): Promise<Player | null> {
  const [row] = await db.select().from(players).where(eq(players.id, id));
  return row ? toPlayer(row) : null;
}

/** The columns a player form fills in, spread into an insert or an update. */
const playerValues = (input: PlayerInput) => ({
  firstName: input.firstName,
  lastName: input.lastName,
  area: input.area,
  photoUrl: input.photoUrl ?? null,
  photoPublicId: input.photoPublicId ?? null,
  position: input.position,
  isDemo: input.isDemo ?? false,
  ...input.skills,
});

export async function createPlayer(input: PlayerInput): Promise<Player> {
  const [row] = await db
    .insert(players)
    .values(playerValues(input))
    .returning();

  return toPlayer(row);
}

export async function updatePlayer(
  id: string,
  input: PlayerInput,
): Promise<Player | null> {
  const [row] = await db
    .update(players)
    .set(playerValues(input))
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
          // Whichever world it belongs to: a sandbox fixture that rolled
          // forward into the real one would put demo rows on the front page.
          isDemo: source.isDemo,
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

export async function listMatches(demo = false): Promise<MatchSummary[]> {
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
    .where(eq(matches.isDemo, demo))
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
      teamId: matchPlayers.teamId,
      isKeeper: matchPlayers.isKeeper,
    })
    .from(matchPlayers)
    .innerJoin(players, eq(players.id, matchPlayers.playerId))
    .where(eq(matchPlayers.matchId, matchId))
    .orderBy(asc(matchPlayers.slot), asc(matchPlayers.createdAt));
}

async function loadTeams(matchId: string) {
  return db
    .select()
    .from(matchTeams)
    .where(eq(matchTeams.matchId, matchId))
    .orderBy(asc(matchTeams.slot));
}

/** Everything a `Match` needs, from the row the caller already has. */
async function hydrate(row: MatchRow): Promise<Match> {
  const [place, lineup, teams] = await Promise.all([
    loadPlace(row.placeId),
    loadLineup(row.id),
    loadTeams(row.id),
  ]);

  return toMatch(row, place, lineup, teams);
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
    // The sandbox has its own address; a demo date must never answer for a
    // real one just because they fall on the same day.
    .where(eq(matches.isDemo, false))
    .orderBy(asc(matches.playedAt));

  const found = rows.find((row) => matchSlug(row.playedAt.getTime()) === slug);
  return found ? getMatch(found.id) : null;
}

export async function getMatch(id: string): Promise<Match | null> {
  const [row] = await db.select().from(matches).where(eq(matches.id, id));
  if (!row) return null;

  return hydrate(row);
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
export async function getNextMatch(demo = false): Promise<Match | null> {
  await materializeRecurringMatches();

  const now = Date.now();
  const world = eq(matches.isDemo, demo);

  const live = await db
    .select()
    .from(matches)
    .where(and(world, lte(matches.playedAt, new Date(now)), stillRunning(now)))
    .orderBy(asc(matches.playedAt))
    .limit(1);

  /*
   * The grace window is for real money: the rental gets collected after the
   * whistle, so a finished match holds the screen for three days. The sandbox
   * owes nobody anything, and holding it there would leave the one screen it
   * has showing a match that is over.
   */
  const settling =
    live.length || demo
      ? []
      : await db
          .select()
          .from(matches)
          .where(and(world, withinGrace(now)))
          .orderBy(desc(matches.playedAt))
          .limit(1);

  const upcoming =
    live.length || settling.length
      ? []
      : await db
          .select()
          .from(matches)
          .where(and(world, stillRunning(now)))
          .orderBy(asc(matches.playedAt))
          .limit(1);

  const row =
    live[0] ??
    settling[0] ??
    upcoming[0] ??
    (
      await db
        .select()
        .from(matches)
        .where(world)
        .orderBy(desc(matches.playedAt))
        .limit(1)
    )[0];

  if (!row) return null;

  return hydrate(row);
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
  const [match] = await db
    .select()
    .from(matches)
    .where(eq(matches.id, matchId));
  if (!match) return { ok: false, reason: "missing" };

  if (match.organizerId === playerId) {
    // Taking it back is refused outright, and granting it writes nothing: the
    // role already implies it, and a stored `paid_at` would outlive the role.
    // Somebody handed the match over and their predecessor would still read as
    // settled, having never paid a thing.
    if (!paid) return { ok: false, reason: "organizer" };

    const settled = await getMatch(matchId);
    return settled
      ? { ok: true, match: settled }
      : { ok: false, reason: "missing" };
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
  const [match] = await db
    .select()
    .from(matches)
    .where(eq(matches.id, matchId));
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
      isDemo: input.isDemo ?? false,
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

  return hydrate(row);
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

  return hydrate(row);
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
  const [match] = await db
    .select()
    .from(matches)
    .where(eq(matches.id, matchId));
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

  return hydrate(match);
}

/**
 * Draws the sides for a match and writes them down.
 *
 * The plan is made here rather than in the browser because this is where the
 * skills live, and because the draw has to be the same for everybody looking at
 * it: whoever presses the button first is who the teams belong to.
 *
 * Re-drawing replaces what was there. The names come from the pool in the same
 * order as the seed, so shuffling again gives new sides *and* new names -- last
 * week's Kernel Panic has nothing to do with this week's.
 */
export async function drawTeams(
  matchId: string,
  seed: number,
  mixAreas = false,
): Promise<Match | null> {
  const [match] = await db
    .select()
    .from(matches)
    .where(eq(matches.id, matchId));
  if (!match) return null;

  const lineup = await loadLineup(matchId);
  if (lineup.length < 4) return hydrate(match);

  const place = await loadPlace(match.placeId);
  const teamSize = place?.format ?? DEFAULT_PITCH_FORMAT;

  const plan = planTeams(
    lineup.map((entry) => toPlayer(entry.player)),
    { teamSize, seed, mixAreas },
  );

  const names = pickNames(plan.teams.length, seed);

  await releaseTeams(matchId);

  const rows = await db
    .insert(matchTeams)
    .values(
      plan.teams.map((team, index) => ({
        matchId,
        slot: team.index,
        name: names[index].name,
        accent: names[index].accent,
      })),
    )
    .returning();

  const bySlot = new Map(rows.map((row) => [row.slot, row.id]));

  for (const team of plan.teams) {
    const teamId = bySlot.get(team.index);
    if (!teamId) continue;

    for (const player of team.players) {
      await db
        .update(matchPlayers)
        .set({ teamId, isKeeper: player.id === team.keeperId })
        .where(
          and(
            eq(matchPlayers.matchId, matchId),
            eq(matchPlayers.playerId, player.id),
          ),
        );
    }
  }

  return hydrate(match);
}

/** Undoes the draw, back to one squad and no sides. */
export async function clearTeams(matchId: string): Promise<Match | null> {
  const [match] = await db
    .select()
    .from(matches)
    .where(eq(matches.id, matchId));
  if (!match) return null;

  await releaseTeams(matchId);

  return hydrate(match);
}

/**
 * Lets the lineup go of its teams, then deletes them.
 *
 * In that order, and never the other way round: a row still pointing at a team
 * is a foreign key waiting to refuse the delete.
 */
async function releaseTeams(matchId: string) {
  await db
    .update(matchPlayers)
    .set({ teamId: null, isKeeper: false })
    .where(eq(matchPlayers.matchId, matchId));

  await db.delete(matchTeams).where(eq(matchTeams.matchId, matchId));
}

/** Distinct names from the pool, walked from a point the seed decides. */
function pickNames(count: number, seed: number) {
  const start = Math.abs(Math.trunc(seed)) % TEAM_NAMES.length;
  const step = 1 + (Math.abs(Math.trunc(seed / TEAM_NAMES.length)) % 3);

  const picked: Array<(typeof TEAM_NAMES)[number]> = [];
  const used = new Set<number>();

  for (let index = 0; picked.length < count; index += 1) {
    // Walking in steps rather than one by one keeps the pairs from always
    // being neighbours in the list. The guard is for a step that lands on the
    // same name twice; the pool is far bigger than any turnout.
    const at = (start + index * step) % TEAM_NAMES.length;
    if (used.has(at)) continue;

    used.add(at);
    picked.push(TEAM_NAMES[at]);

    if (used.size === TEAM_NAMES.length) break;
  }

  return picked;
}

/* -------------------------------- the season ----------------------------- */

/**
 * Every night that has been played, in one go.
 *
 * Four queries for the whole season rather than four per match: an office plays
 * once a week, so this is a few hundred rows, and the arithmetic happens in
 * `buildStats` where it can be tested without a database.
 */
export async function getStats(demo = false): Promise<Stats> {
  const all = await db
    .select({ id: matches.id, playedAt: matches.playedAt })
    .from(matches)
    .where(eq(matches.isDemo, demo))
    .orderBy(desc(matches.playedAt));

  if (all.length === 0) return { players: [], matches: [] };

  const withGames = new Set(
    (
      await db
        .select({ matchId: matchGames.matchId })
        .from(matchGames)
        .where(
          inArray(
            matchGames.matchId,
            all.map((row) => row.id),
          ),
        )
    ).map((row) => row.matchId),
  );

  const now = Date.now();
  const played = all.filter(
    (row) => row.playedAt.getTime() <= now || withGames.has(row.id),
  );

  if (played.length === 0) return { players: [], matches: [] };

  const ids = played.map((row) => row.id);

  const [lineup, teams, games, goals] = await Promise.all([
    db
      .select({
        matchId: matchPlayers.matchId,
        playerId: matchPlayers.playerId,
        teamId: matchPlayers.teamId,
      })
      .from(matchPlayers)
      .where(inArray(matchPlayers.matchId, ids)),
    db.select().from(matchTeams).where(inArray(matchTeams.matchId, ids)),
    db.select().from(matchGames).where(inArray(matchGames.matchId, ids)),
    db.select().from(matchGoals).where(inArray(matchGoals.matchId, ids)),
  ]);

  const group = <T extends { matchId: string }>(rows: T[]) => {
    const by = new Map<string, T[]>();
    for (const row of rows) {
      by.set(row.matchId, [...(by.get(row.matchId) ?? []), row]);
    }
    return by;
  };

  const lineupBy = group(lineup);
  const teamsBy = group(teams);
  const gamesBy = group(games);
  const goalsBy = group(goals);

  return buildStats({
    matches: played.map((match) => ({
      id: match.id,
      playedAt: match.playedAt.getTime(),
      lineup: (lineupBy.get(match.id) ?? []).map((row) => ({
        playerId: row.playerId,
        teamId: row.teamId,
      })),
      teams: (teamsBy.get(match.id) ?? [])
        .sort((left, right) => left.slot - right.slot)
        .map((row) => ({
          id: row.id,
          slot: row.slot,
          name: row.name,
          accent: row.accent,
          playerIds: (lineupBy.get(match.id) ?? [])
            .filter((entry) => entry.teamId === row.id)
            .map((entry) => entry.playerId),
          keeperId: null,
          borrowedKeeper: false,
        })),
      games: (gamesBy.get(match.id) ?? []).map(toGame),
      goals: (goalsBy.get(match.id) ?? []).map(toGoal),
    })),
  });
}

/* -------------------------------- the demo ------------------------------- */

const DEMO_NAMES: Array<[string, string, string]> = [
  ["Maximo", "Guzman", "gk"],
  ["Erick", "Santos", "def"],
  ["Joaquin", "Angeles", "def"],
  ["Adrian", "Zavaleta", "mid"],
  ["Victor", "Amaya", "mid"],
  ["Alfredo", "Saira", "fwd"],
  ["Cristian", "Maldonado", "gk"],
  ["Emilio", "Cardenas", "def"],
  ["Diego", "Villalobos", "def"],
  ["Luis", "Bermudez", "mid"],
  ["Marco", "Ferreyra", "mid"],
  ["Sergio", "Palacios", "fwd"],
  ["Bruno", "Carranza", "gk"],
  ["Ivan", "Rojas", "def"],
  ["Pablo", "Quiroz", "mid"],
  ["Hugo", "Lazo", "fwd"],
  ["Ruben", "Tapia", "def"],
  ["Tomas", "Escobar", "mid"],
];

/**
 * Makes sure the sandbox exists, and hands back its match.
 *
 * Seeded on the first visit, and rolled on after that: once the sandbox match
 * has been played out, the next one is put half an hour ahead with the same
 * squad. It is always a match about to start, which is what keeps every gate
 * in the app open at once, and every night that has been played stays in the
 * history with its own teams, goals and table.
 */
export async function ensureDemo(): Promise<Match> {
  const [existing] = await db
    .select()
    .from(matches)
    .where(eq(matches.isDemo, true))
    .orderBy(desc(matches.playedAt))
    .limit(1);

  if (existing && endOf(existing) > Date.now()) return hydrate(existing);

  /*
   * The last one has been played out. Rather than reseed -- which would take
   * the night's goals and its table with it -- the sandbox does what a real
   * week does: the finished match stays where it is, and the same squad gets a
   * new one to draw sides for. Its teams and its goals are its own.
   */
  if (existing) {
    const lineup = await db
      .select({ playerId: matchPlayers.playerId, slot: matchPlayers.slot })
      .from(matchPlayers)
      .where(eq(matchPlayers.matchId, existing.id))
      .orderBy(asc(matchPlayers.slot));

    return demoMatch(
      existing.placeId,
      existing.organizerId,
      lineup.map((entry) => entry.playerId),
    );
  }

  const [place] = await db
    .insert(places)
    .values({
      name: "Demo pitch",
      address: "Wherever you like",
      price: 210,
      format: 7,
      isDemo: true,
    })
    .returning();

  const squad = await db
    .insert(players)
    .values(
      DEMO_NAMES.map(([firstName, lastName, position], index) => ({
        firstName,
        lastName,
        area: AREA_IDS[index % AREA_IDS.length],
        // Faces, through this app's own proxy so the share card can draw them.
        // Every fourth one goes without, which is what the real squad looks
        // like and what exercises the initials fallback.
        photoUrl: index % 4 === 3 ? null : `/api/demo/avatar/men-${index}`,
        position,
        // Spread across the range, so the balancer has something to balance.
        pace: 1 + ((index * 7) % 5),
        stamina: 1 + ((index * 3) % 5),
        finishing: 1 + ((index * 11) % 5),
        passing: 1 + ((index * 5) % 5),
        defending: 1 + ((index * 13) % 5),
        goalkeeping: position === "gk" ? 5 : 1 + (index % 3),
        isDemo: true,
      })),
    )
    .returning();

  return demoMatch(
    place.id,
    squad[0].id,
    squad.map((player) => player.id),
  );
}

/**
 * One sandbox match, kicking off in half an hour.
 *
 * That half hour is what opens every gate at once: the sides can be drawn (two
 * hours before), the night can be played and the rental can be settled, with
 * nothing special-cased for the demo.
 */
async function demoMatch(
  placeId: string | null,
  organizerId: string | null,
  playerIds: string[],
): Promise<Match> {
  const playedAt = new Date(Date.now() + 30 * 60 * 1000);

  const [match] = await db
    .insert(matches)
    .values({
      playedAt,
      endsAt: new Date(playedAt.getTime() + DEFAULT_MATCH_DURATION_MS),
      placeId,
      organizerId,
      isDemo: true,
    })
    .returning();

  if (playerIds.length) {
    await db.insert(matchPlayers).values(
      playerIds.map((playerId, index) => ({
        matchId: match.id,
        playerId,
        slot: index,
      })),
    );
  }

  return hydrate(match);
}

/** Wipes the sandbox and builds a fresh one. */
export async function resetDemo(): Promise<Match> {
  // The match takes its teams, games, goals and lineup with it.
  await db.delete(matches).where(eq(matches.isDemo, true));
  await db.delete(players).where(eq(players.isDemo, true));
  await db.delete(places).where(eq(places.isDemo, true));

  return ensureDemo();
}

/* ------------------------------- the night ------------------------------ */

const toGame = (row: MatchGameRow): MatchGame => ({
  id: row.id,
  slot: row.slot,
  homeTeamId: row.homeTeamId,
  awayTeamId: row.awayTeamId,
  startedAt: row.startedAt.getTime(),
  endedAt: row.endedAt?.getTime() ?? null,
});

const toGoal = (row: MatchGoalRow): MatchGoal => ({
  id: row.id,
  gameId: row.gameId,
  teamId: row.teamId,
  playerId: row.playerId,
  scoredAt: row.scoredAt.getTime(),
});

/** Everything that happened on the night. No other screen asks for it. */
export async function getMatchLive(matchId: string): Promise<MatchLive> {
  const [games, goals] = await Promise.all([
    db
      .select()
      .from(matchGames)
      .where(eq(matchGames.matchId, matchId))
      .orderBy(asc(matchGames.slot)),
    db
      .select()
      .from(matchGoals)
      .where(eq(matchGoals.matchId, matchId))
      .orderBy(asc(matchGoals.scoredAt)),
  ]);

  return { games: games.map(toGame), goals: goals.map(toGoal) };
}

/**
 * Starts a game between two sides.
 *
 * Whatever was running is whistled off first: two games at once is not a state
 * a pitch can be in, and letting the second one start is friendlier than
 * refusing it because somebody forgot to press stop.
 */
export async function startGame(
  matchId: string,
  homeTeamId: string,
  awayTeamId: string,
): Promise<MatchLive> {
  const now = new Date();

  await db
    .update(matchGames)
    .set({ endedAt: now })
    .where(and(eq(matchGames.matchId, matchId), isNull(matchGames.endedAt)));

  const played = await db
    .select({ slot: matchGames.slot })
    .from(matchGames)
    .where(eq(matchGames.matchId, matchId));

  const slot = played.reduce((top, row) => Math.max(top, row.slot + 1), 0);

  await db
    .insert(matchGames)
    .values({ matchId, slot, homeTeamId, awayTeamId, startedAt: now });

  return getMatchLive(matchId);
}

/** The final whistle for one game. Already ended is left alone. */
export async function endGame(
  matchId: string,
  gameId: string,
): Promise<MatchLive> {
  await db
    .update(matchGames)
    .set({ endedAt: new Date() })
    .where(
      and(
        eq(matchGames.matchId, matchId),
        eq(matchGames.id, gameId),
        isNull(matchGames.endedAt),
      ),
    );

  return getMatchLive(matchId);
}

/**
 * Writes a goal down.
 *
 * The side is read from the lineup rather than sent by the caller: the scorer
 * is the only thing anybody taps, and a goal credited to a team the player is
 * not on is a bug nobody would spot until the table looked wrong.
 */
export async function addGoal(
  matchId: string,
  gameId: string,
  playerId: string,
  recordedBy: string | null,
): Promise<MatchLive | null> {
  const [entry] = await db
    .select({ teamId: matchPlayers.teamId })
    .from(matchPlayers)
    .where(
      and(
        eq(matchPlayers.matchId, matchId),
        eq(matchPlayers.playerId, playerId),
      ),
    );

  if (!entry?.teamId) return null;

  await db.insert(matchGoals).values({
    matchId,
    gameId,
    teamId: entry.teamId,
    playerId,
    scoredAt: new Date(),
    recordedBy,
  });

  return getMatchLive(matchId);
}

/**
 * Ends the night.
 *
 * The running game is whistled off and the match's end is moved to now, which
 * is what stops the screen offering another one. The date and the lineup are
 * untouched: this says "we are done", not "this never happened".
 */
export async function finishMatch(matchId: string): Promise<Match | null> {
  const [match] = await db
    .select()
    .from(matches)
    .where(eq(matches.id, matchId));
  if (!match) return null;

  const now = new Date();

  await db
    .update(matchGames)
    .set({ endedAt: now })
    .where(and(eq(matchGames.matchId, matchId), isNull(matchGames.endedAt)));

  await db.update(matches).set({ endsAt: now }).where(eq(matches.id, matchId));

  const [updated] = await db
    .select()
    .from(matches)
    .where(eq(matches.id, matchId));

  return hydrate(updated);
}

/** Takes one back off the board. Anybody can, because anybody can add one. */
export async function removeGoal(
  matchId: string,
  goalId: string,
): Promise<MatchLive | null> {
  const [goal] = await db
    .select({ gameId: matchGoals.gameId })
    .from(matchGoals)
    .where(and(eq(matchGoals.matchId, matchId), eq(matchGoals.id, goalId)));

  if (!goal) return getMatchLive(matchId);

  const [game] = await db
    .select({ endedAt: matchGames.endedAt })
    .from(matchGames)
    .where(eq(matchGames.id, goal.gameId));

  /*
   * Only the game being played can be corrected.
   *
   * A mistyped goal is noticed within the minute; one taken off a game that
   * finished an hour ago rewrites a result the teams already played on, and
   * the table with it.
   */
  if (game?.endedAt) return null;

  await db
    .delete(matchGoals)
    .where(and(eq(matchGoals.matchId, matchId), eq(matchGoals.id, goalId)));

  return getMatchLive(matchId);
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
