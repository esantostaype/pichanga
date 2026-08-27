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
    lat: real("lat"),
    lng: real("lng"),
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
    createdAt: createdAt(),
  },
  (t) => [
    primaryKey({ columns: [t.matchId, t.playerId] }),
    index("match_players_match_idx").on(t.matchId, t.slot),
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
  place: one(places, {
    fields: [matches.placeId],
    references: [places.id],
  }),
}));

export const matchPlayersRelations = relations(matchPlayers, ({ one }) => ({
  match: one(matches, {
    fields: [matchPlayers.matchId],
    references: [matches.id],
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
export type MatchMediaRow = typeof matchMedia.$inferSelect;
export type VisitorRow = typeof visitors.$inferSelect;
