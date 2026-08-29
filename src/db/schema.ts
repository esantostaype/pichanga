import { relations } from "drizzle-orm";
import {
  index,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());

const createdAt = () =>
  integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date());

/* -------------------------------------------------------------------------- */
/*                                   players                                  */
/* -------------------------------------------------------------------------- */

export const players = sqliteTable(
  "players",
  {
    id: id(),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    area: text("area").notNull(),
    photoUrl: text("photo_url"),
    photoPublicId: text("photo_public_id"),
    /** Where they want to play: gk, def, mid or fwd. */
    position: text("position").notNull().default("mid"),
    /*
     * The six skills, 1 to 5. Everybody starts average rather than blank, so a
     * player nobody has rated yet still balances into a team sensibly.
     */
    pace: integer("pace").notNull().default(3),
    stamina: integer("stamina").notNull().default(3),
    finishing: integer("finishing").notNull().default(3),
    passing: integer("passing").notNull().default(3),
    defending: integer("defending").notNull().default(3),
    goalkeeping: integer("goalkeeping").notNull().default(3),
    /** Sandbox row: only the demo screen sees it, and only it sees them. */
    isDemo: integer("is_demo", { mode: "boolean" }).notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [index("players_last_name_idx").on(t.lastName, t.firstName)],
);

/* -------------------------------------------------------------------------- */
/*                                   places                                   */
/* -------------------------------------------------------------------------- */

export const places = sqliteTable(
  "places",
  {
    id: id(),
    name: text("name").notNull(),
    address: text("address"),
    /** Google `place_id`, when the venue came from the autocomplete. */
    googlePlaceId: text("google_place_id"),
    /** Ready-to-open maps link. */
    mapsUrl: text("maps_url"),
    /** Rental price for one match, split across whoever plays. */
    price: real("price"),
    /** How many a side it takes: 5, 7, 8, 9 or 11. Null until somebody says. */
    format: integer("format"),
    lat: real("lat"),
    lng: real("lng"),
    /** Sandbox row: only the demo screen sees it, and only it sees them. */
    isDemo: integer("is_demo", { mode: "boolean" }).notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [index("places_name_idx").on(t.name)],
);

/* -------------------------------------------------------------------------- */
/*                                   matches                                  */
/* -------------------------------------------------------------------------- */

export const matches = sqliteTable(
  "matches",
  {
    id: id(),
    /** Kick-off. */
    playedAt: integer("played_at", { mode: "timestamp_ms" }).notNull(),
    /**
     * Final whistle. Nullable only so the column could be added to existing
     * rows; the app always writes it and readers fall back to
     * `playedAt + DEFAULT_MATCH_DURATION_MS`.
     */
    endsAt: integer("ends_at", { mode: "timestamp_ms" }),
    /**
     * Minutes a game runs before the sides change, agreed when the teams are
     * drawn. Nullable because the column arrived after the rows did; readers
     * fall back to `DEFAULT_GAME_MINUTES`.
     */
    gameMinutes: integer("game_minutes"),
    placeId: text("place_id").references(() => places.id, {
      onDelete: "set null",
    }),
    /** Whoever is running this one. Their token wears the crown. */
    organizerId: text("organizer_id").references(() => players.id, {
      onDelete: "set null",
    }),
    /** `null` for a one-off, `"weekly"` for a repeating fixture. */
    recurrence: text("recurrence"),
    /** Groups every occurrence generated from the same recurring fixture. */
    seriesId: text("series_id"),
    /** Sandbox row: only the demo screen sees it, and only it sees them. */
    isDemo: integer("is_demo", { mode: "boolean" }).notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [
    index("matches_played_at_idx").on(t.playedAt),
    // Guards the lazy materialization against duplicates when two requests
    // race to create the same occurrence. NULL series ids stay distinct in
    // SQLite, so one-off matches are unaffected.
    uniqueIndex("matches_series_slot_idx").on(t.seriesId, t.playedAt),
  ],
);

/* -------------------------------------------------------------------------- */
/*                                 match_teams                                */
/* -------------------------------------------------------------------------- */

/**
 * The teams drawn for one match.
 *
 * They belong to the match, not to the office: the same twenty people are a
 * different three teams next week, and last week's sides are part of what
 * happened that day.
 */
export const matchTeams = sqliteTable(
  "match_teams",
  {
    id: id(),
    matchId: text("match_id")
      .notNull()
      .references(() => matches.id, { onDelete: "cascade" }),
    /** Draw order, and the band of the pitch the team lines up in. */
    slot: integer("slot").notNull(),
    name: text("name").notNull(),
    /** Colour of the crest, so a team is recognisable at a glance. */
    accent: text("accent").notNull(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("match_teams_slot_idx").on(t.matchId, t.slot)],
);

/* -------------------------------------------------------------------------- */
/*                         match_players (join table)                         */
/* -------------------------------------------------------------------------- */

export const matchPlayers = sqliteTable(
  "match_players",
  {
    matchId: text("match_id")
      .notNull()
      .references(() => matches.id, { onDelete: "cascade" }),
    playerId: text("player_id")
      .notNull()
      .references(() => players.id, { onDelete: "cascade" }),
    /** Sign-up order: drives how the lineup expands out from the center. */
    slot: integer("slot").notNull().default(0),
    /**
     * When this player settled their share of the rental. Null means they
     * still owe it, which is the whole reason a finished match lingers.
     */
    paidAt: integer("paid_at", { mode: "timestamp_ms" }),
    /** Which side they were drawn into, once the teams exist. */
    teamId: text("team_id").references(() => matchTeams.id, {
      onDelete: "set null",
    }),
    /** Whether they are the one in goal for that side. */
    isKeeper: integer("is_keeper", { mode: "boolean" }).notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [
    primaryKey({ columns: [t.matchId, t.playerId] }),
    index("match_players_match_idx").on(t.matchId, t.slot),
  ],
);

/* -------------------------------------------------------------------------- */
/*                          match_games and match_goals                       */
/* -------------------------------------------------------------------------- */

/**
 * One game inside a match.
 *
 * Two teams play, one waits: with three sides drawn the evening is a run of ten
 * minute games with the loser coming off, so the match on the calendar is not
 * the thing that has a score -- these are.
 *
 * The clock is `startedAt` and nothing else. Every phone works out the time on
 * its own from that one timestamp, which is the only way six devices agree
 * about how long is left.
 */
export const matchGames = sqliteTable(
  "match_games",
  {
    id: id(),
    matchId: text("match_id")
      .notNull()
      .references(() => matches.id, { onDelete: "cascade" }),
    /** Order played, from zero. */
    slot: integer("slot").notNull(),
    homeTeamId: text("home_team_id")
      .notNull()
      .references(() => matchTeams.id, { onDelete: "cascade" }),
    awayTeamId: text("away_team_id")
      .notNull()
      .references(() => matchTeams.id, { onDelete: "cascade" }),
    startedAt: integer("started_at", { mode: "timestamp_ms" }).notNull(),
    /** Null while it is being played. */
    endedAt: integer("ended_at", { mode: "timestamp_ms" }),
    createdAt: createdAt(),
  },
  (t) => [index("match_games_match_idx").on(t.matchId, t.slot)],
);

/**
 * A goal, and who scored it.
 *
 * `recordedBy` is the browser that tapped it in -- the same made-up id the
 * visitor counter uses, not a person. Nobody here has an account yet, so it
 * cannot say who; it can only say whether four goals came from four phones or
 * from one, which is enough to sort out an argument about a 4-3.
 */
export const matchGoals = sqliteTable(
  "match_goals",
  {
    id: id(),
    matchId: text("match_id")
      .notNull()
      .references(() => matches.id, { onDelete: "cascade" }),
    gameId: text("game_id")
      .notNull()
      .references(() => matchGames.id, { onDelete: "cascade" }),
    teamId: text("team_id")
      .notNull()
      .references(() => matchTeams.id, { onDelete: "cascade" }),
    playerId: text("player_id")
      .notNull()
      .references(() => players.id, { onDelete: "cascade" }),
    scoredAt: integer("scored_at", { mode: "timestamp_ms" }).notNull(),
    recordedBy: text("recorded_by"),
    createdAt: createdAt(),
  },
  (t) => [index("match_goals_game_idx").on(t.gameId, t.scoredAt)],
);

/* -------------------------------------------------------------------------- */
/*                                match_media                                 */
/* -------------------------------------------------------------------------- */

/**
 * Photos and clips from a match. The file lives in Cloudinary; this table only
 * remembers where it is, so `publicId` is what makes deletion possible.
 */
export const matchMedia = sqliteTable(
  "match_media",
  {
    id: id(),
    matchId: text("match_id")
      .notNull()
      .references(() => matches.id, { onDelete: "cascade" }),
    publicId: text("public_id").notNull(),
    url: text("url").notNull(),
    /** `image` or `video`. */
    kind: text("kind").notNull(),
    /** Poster frame, for a video. */
    thumbnailUrl: text("thumbnail_url"),
    width: integer("width"),
    height: integer("height"),
    createdAt: createdAt(),
  },
  (t) => [index("match_media_match_idx").on(t.matchId, t.createdAt)],
);

/* -------------------------------------------------------------------------- */
/*                                  visitors                                  */
/* -------------------------------------------------------------------------- */

/**
 * Live presence, and nothing else. The id is a random value the browser makes
 * up for itself: no address, no device, no link to a player, so the table can
 * only ever answer "how many", never "who".
 */
export const visitors = sqliteTable(
  "visitors",
  {
    id: text("id").primaryKey(),
    lastSeen: integer("last_seen", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [index("visitors_last_seen_idx").on(t.lastSeen)],
);

/* -------------------------------------------------------------------------- */
/*                                  relations                                 */
/* -------------------------------------------------------------------------- */

export const playersRelations = relations(players, ({ many }) => ({
  matchPlayers: many(matchPlayers),
}));

export const placesRelations = relations(places, ({ many }) => ({
  matches: many(matches),
}));

export const matchesRelations = relations(matches, ({ many, one }) => ({
  matchPlayers: many(matchPlayers),
  media: many(matchMedia),
  teams: many(matchTeams),
  place: one(places, {
    fields: [matches.placeId],
    references: [places.id],
  }),
}));

export const matchTeamsRelations = relations(matchTeams, ({ many, one }) => ({
  match: one(matches, {
    fields: [matchTeams.matchId],
    references: [matches.id],
  }),
  matchPlayers: many(matchPlayers),
}));

export const matchPlayersRelations = relations(matchPlayers, ({ one }) => ({
  match: one(matches, {
    fields: [matchPlayers.matchId],
    references: [matches.id],
  }),
  team: one(matchTeams, {
    fields: [matchPlayers.teamId],
    references: [matchTeams.id],
  }),
  player: one(players, {
    fields: [matchPlayers.playerId],
    references: [players.id],
  }),
}));

export type PlayerRow = typeof players.$inferSelect;
export type PlaceRow = typeof places.$inferSelect;
export type MatchRow = typeof matches.$inferSelect;
export type MatchPlayerRow = typeof matchPlayers.$inferSelect;
export type MatchTeamRow = typeof matchTeams.$inferSelect;
export type MatchGameRow = typeof matchGames.$inferSelect;
export type MatchGoalRow = typeof matchGoals.$inferSelect;
export type MatchMediaRow = typeof matchMedia.$inferSelect;
export type VisitorRow = typeof visitors.$inferSelect;
