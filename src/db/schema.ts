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
    /** "yyyy-MM-dd". Their age category is worked out from it, never stored. */
    birthDate: text("birth_date"),
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
/*                                   venues                                   */
/* -------------------------------------------------------------------------- */

export const venues = sqliteTable(
  "venues",
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
  (t) => [index("venues_name_idx").on(t.name)],
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
    venueId: text("venue_id").references(() => venues.id, {
      onDelete: "set null",
    }),
    /**
     * Which pitch inside the venue, as the venue writes it: `Cancha 4 - F7`.
     *
     * On the match and not on the venue: whichever one they manage to book
     * changes week to week, and the venue is the part that does not. Free text
     * on purpose -- a venue names its pitches however it likes, so there is
     * nothing to validate and nothing worth a table of its own. What the
     * office needs from it is the line that says which gate to walk to.
     */
    pitch: text("pitch"),
    /**
     * What each player puts into the pot for the night. The side that tops the
     * table takes the lot, split between its players. Zero means no bet.
     */
    bet: real("bet").notNull().default(5),
    /**
     * When somebody pressed "close the night" on the results. Until then the
     * night can still go on, however late it runs past `endsAt`.
     */
    closedAt: integer("closed_at", { mode: "timestamp_ms" }),
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
    /**
     * Signed up and never turned up. They stay on the match -- out of the
     * sides, off the pitch -- because they owe the bet as a penalty, and that
     * penalty goes towards the pitch everybody else is paying for.
     */
    noShow: integer("no_show", { mode: "boolean" }).notNull().default(false),
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

/**
 * A player lent to a side for one game, before or during it.
 *
 * With the turnout split into sides of seven, seven and six, the six never
 * plays a man down: for each of its games it borrows somebody from a side that
 * is sitting that one out. Per game rather than per night, because the side
 * they came from plays the next one and wants them back.
 *
 * Their goals count for the side they were lent to -- `addGoal` reads this
 * table before it reads the lineup -- and their share of the pot stays with
 * their own side.
 */
export const matchLoans = sqliteTable(
  "match_loans",
  {
    id: id(),
    matchId: text("match_id")
      .notNull()
      .references(() => matches.id, { onDelete: "cascade" }),
    /**
     * Which game of the night, by its order: the same number `match_games`
     * gives it. Keyed on this rather than on the game row so a loan can be
     * agreed before kick-off, when there is no row yet.
     */
    slot: integer("slot").notNull(),
    /** The side they are lent to. */
    teamId: text("team_id")
      .notNull()
      .references(() => matchTeams.id, { onDelete: "cascade" }),
    playerId: text("player_id")
      .notNull()
      .references(() => players.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("match_loans_slot_player_idx").on(t.matchId, t.slot, t.playerId),
  ],
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
/*                             push_subscriptions                             */
/* -------------------------------------------------------------------------- */

/**
 * A browser that asked to be told when a game ends, even with the phone
 * locked.
 *
 * What a push service hands back when the browser subscribes: where to send
 * (`endpoint`) and the two keys the message is encrypted with. Tied to the
 * match it is following, not to a player -- nobody signs in, and the phone in
 * somebody's pocket is not necessarily theirs. Opening another match's night
 * moves it there.
 */
export const pushSubscriptions = sqliteTable(
  "push_subscriptions",
  {
    id: id(),
    endpoint: text("endpoint").notNull(),
    p256dh: text("p256dh").notNull(),
    auth: text("auth").notNull(),
    matchId: text("match_id").references(() => matches.id, {
      onDelete: "set null",
    }),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("push_subscriptions_endpoint_idx").on(t.endpoint),
    index("push_subscriptions_match_idx").on(t.matchId),
  ],
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

export const venuesRelations = relations(venues, ({ many }) => ({
  matches: many(matches),
}));

export const matchesRelations = relations(matches, ({ many, one }) => ({
  matchPlayers: many(matchPlayers),
  media: many(matchMedia),
  teams: many(matchTeams),
  venue: one(venues, {
    fields: [matches.venueId],
    references: [venues.id],
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
export type VenueRow = typeof venues.$inferSelect;
export type MatchRow = typeof matches.$inferSelect;
export type MatchPlayerRow = typeof matchPlayers.$inferSelect;
export type MatchTeamRow = typeof matchTeams.$inferSelect;
export type MatchGameRow = typeof matchGames.$inferSelect;
export type MatchGoalRow = typeof matchGoals.$inferSelect;
export type MatchLoanRow = typeof matchLoans.$inferSelect;
export type MatchMediaRow = typeof matchMedia.$inferSelect;
export type VisitorRow = typeof visitors.$inferSelect;
