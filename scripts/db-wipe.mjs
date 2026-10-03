/**
 * Empties the database: every player, venue, match, goal and photo record,
 * real and sandbox alike. The tables and the migration history stay.
 *
 *   node --env-file=.env.local scripts/db-wipe.mjs
 *   node --env-file=.env.local scripts/db-wipe.mjs --yes
 *
 * The demo is not lost with it: `/demo` builds its sandbox again from
 * `src/data/demo.json` on the next visit, which is the only way its players
 * pick up fields added since they were seeded -- birthdays among them.
 *
 * The files behind photos and the match gallery live in Cloudinary and stay
 * there; this only forgets where they were.
 *
 * Without `--yes` it counts what it would delete and writes nothing. It says
 * which database it is talking to before anything else, because this is the
 * one script in the folder that cannot be undone.
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

/* Children before parents, so it works with foreign keys on or off. */
const TABLES = [
  "match_goals",
  "match_games",
  "match_media",
  "match_players",
  "match_teams",
  "matches",
  "players",
  "venues",
  "visitors",
];

const count = async (table) =>
  Number((await db.execute(`select count(*) as n from ${table}`)).rows[0].n);

console.log(`database: ${name}`);

const before = {};
for (const table of TABLES) before[table] = await count(table);

console.log(
  TABLES.map((table) => `  ${table.padEnd(14)} ${before[table]}`).join("\n"),
);

const total = Object.values(before).reduce((sum, n) => sum + n, 0);

if (total === 0) {
  console.log("\nAlready empty.");
  process.exit(0);
}

if (!write) {
  console.log(`\nDry run. Add --yes to delete all ${total} row(s).`);
  process.exit(0);
}

await db.batch(
  TABLES.map((table) => `delete from ${table}`),
  "write",
);

let left = 0;
for (const table of TABLES) left += await count(table);

console.log(
  left === 0
    ? "\nEmpty. The demo builds itself again on the next visit to /demo."
    : `\nSomething is still there: ${left} row(s) left.`,
);
