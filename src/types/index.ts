import type { PositionId, SkillId } from "@/lib/constants";

export type Player = {
  id: string;
  firstName: string;
  lastName: string;
  area: string;
  photoUrl: string | null;
  photoPublicId: string | null;
  /** Where they want to play, which is also how their strength is weighed. */
  position: PositionId;
  /** The six skills, 1 to 5, all of them 3 until somebody says otherwise. */
  skills: Record<SkillId, number>;
  /** epoch ms, serializable across the server/client boundary */
  createdAt: number;
};

export type Place = {
  id: string;
  name: string;
  address: string | null;
  googlePlaceId: string | null;
  mapsUrl: string | null;
  /** Rental price for one match, split across whoever plays. */
  price: number | null;
  /** How many a side the pitch takes, null until somebody fills it in. */
  format: number | null;
  lat: number | null;
  lng: number | null;
  createdAt: number;
};

/** Only `weekly` for now; the column is text so more rules can be added. */
export type Recurrence = "weekly";

export type MatchSummary = {
  id: string;
  playedAt: number;
  endsAt: number;
  place: Place | null;
  /** Player running the match; their token wears the crown. */
  organizerId: string | null;
  recurrence: Recurrence | null;
  seriesId: string | null;
  playerCount: number;
  /** How many of them have settled their share of the rental. */
  paidCount: number;
  createdAt: number;
};

/**
 * One side drawn for a match.
 *
 * The keeper is called out because it is the one place on the pitch that has to
 * be filled, and `borrowedKeeper` says whether the person in goal chose to be
 * there or was the least bad option on the day.
 */
export type MatchTeam = {
  id: string;
  /** Draw order, and the band of the pitch they line up in. */
  slot: number;
  name: string;
  accent: string;
  playerIds: string[];
  keeperId: string | null;
  borrowedKeeper: boolean;
};

export type Match = {
  id: string;
  playedAt: number;
  endsAt: number;
  /** Minutes each game runs before the sides change, agreed for the night. */
  gameMinutes: number;
  place: Place | null;
  organizerId: string | null;
  recurrence: Recurrence | null;
  seriesId: string | null;
  createdAt: number;
  players: Player[];
  /** Ids of the players who already paid their share. */
  paidPlayerIds: string[];
  /** Empty until somebody draws the sides, which is the usual state. */
  teams: MatchTeam[];
  /** A sandbox match, where the clock is not a rule. */
  isDemo: boolean;
};

/** One game inside a match: two sides on, the rest waiting. */
export type MatchGame = {
  id: string;
  slot: number;
  homeTeamId: string;
  awayTeamId: string;
  startedAt: number;
  /** Null while it is being played. */
  endedAt: number | null;
};

export type MatchGoal = {
  id: string;
  gameId: string;
  teamId: string;
  playerId: string;
  scoredAt: number;
};

/** Everything that happened on the night, which no other screen needs. */
export type MatchLive = {
  games: MatchGame[];
  goals: MatchGoal[];
};

/** One photo or clip in a match gallery. */
export type MatchMedia = {
  id: string;
  matchId: string;
  kind: "image" | "video";
  url: string;
  /** Poster frame for a video; images use `url`. */
  thumbnailUrl: string | null;
  width: number | null;
  height: number | null;
  createdAt: number;
};

/** A venue suggestion coming from the Google Places autocomplete. */
export type PlaceSuggestion = {
  googlePlaceId: string;
  title: string;
  subtitle: string;
};

export type ApiError = { error: string };
