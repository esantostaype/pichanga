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
    /** Match date and time. */
    playedAt: integer("played_at", { mode: "timestamp_ms" }).notNull(),
    placeId: text("place_id").references(() => places.id, {
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
    createdAt: createdAt(),
  },
  (t) => [
    primaryKey({ columns: [t.matchId, t.playerId] }),
    index("match_players_match_idx").on(t.matchId, t.slot),
  ],
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
