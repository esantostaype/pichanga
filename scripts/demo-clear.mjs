/**
 * Takes the sandbox out of a database.
 *
 *   node --env-file=.env.local scripts/demo-clear.mjs
 *   node --env-file=.env.local scripts/demo-clear.mjs --yes
 *
 * Everything the demo owns is marked `is_demo`, so this is four deletes and
 * nothing else can be caught by them. The match takes its teams, games, goals
 * and lineup with it -- those cascade -- and the players and the pitch go with
 * it because nothing real ever pointed at them.
 *
 * Without `--yes` it counts what it would delete and writes nothing. It also
 * says which database it is talking to before it does anything, because the
 * one thing worse than a sandbox in production is a delete in the wrong place.
 */

import { createClient } from "@libsql/client";

const write = process.argv.includes("--yes");

const url = process.env.TURSO_DATABASE_URL;
if (!url) {
  console.error("No TURSO_DATABASE_URL. Run with: node --env-file=.env.local");
  process.exit(1);
}

const db = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });

const name = url.startsWith("file:")
  ? url
  : url.replace(/^libsql:\/\//, "").split(".")[0];

const count = async (table) => {
  const result = await db.execute(
    `select count(*) as n from ${table} where is_demo = 1`,
  );
  return Number(result.rows[0].n);
};

/* Rows that belong to a demo match but carry no flag of their own. */
const owned = async (table, column = "match_id") => {
  const result = await db.execute(
    `select count(*) as n from ${table} where ${column} in (select id from matches where is_demo = 1)`,
  );
  return Number(result.rows[0].n);
};

console.log(`database: ${name}`);

const before = {
  matches: await count("matches"),
  players: await count("players"),
  places: await count("places"),
  lineup: await owned("match_players"),
  teams: await owned("match_teams"),
  games: await owned("match_games"),
};

const goals = Number(
  (
    await db.execute(
      "select count(*) as n from match_goals where game_id in (select id from match_games where match_id in (select id from matches where is_demo = 1))",
    )
  ).rows[0].n,
);

console.log(
  [
    `  matches ${before.matches}`,
    `  players ${before.players}`,
    `  places  ${before.places}`,
    `  lineup  ${before.lineup}`,
    `  teams   ${before.teams}`,
    `  games   ${before.games}`,
    `  goals   ${goals}`,
  ].join("\n"),
);

const total = Object.values(before).reduce((sum, n) => sum + n, 0) + goals;

if (total === 0) {
  console.log("\nNothing to clear.");
  process.exit(0);
}

if (!write) {
  console.log("\nDry run. Add --yes to delete all of it.");
  process.exit(0);
}

// The match goes first: its teams, games, goals and lineup cascade off it, and
// the lineup is what points at the players.
await db.execute("delete from matches where is_demo = 1");
await db.execute("delete from players where is_demo = 1");
await db.execute("delete from places where is_demo = 1");

const left =
  (await count("matches")) + (await count("players")) + (await count("places"));

console.log(
  left === 0
    ? "\nCleared. The sandbox builds itself again on the next visit to /demo."
    : `\nSomething is still there: ${left} row(s) still marked as the demo's.`,
);
