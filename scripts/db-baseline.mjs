/**
 * Tells a database which migrations it already has.
 *
 * A database whose schema was only ever `push`ed has no `__drizzle_migrations`
 * table, so `db:migrate` would start at 0000 and fall over on the first table
 * that already exists. Baselining writes the history it should have had, and
 * from then on migrations run normally.
 *
 *   node scripts/db-baseline.mjs --through 0009_sudden_abomination
 *   node scripts/db-baseline.mjs --through 0009_sudden_abomination --yes
 *
 * Without `--yes` it only says what it would do. It never touches the schema
 * itself: the tables it names have to be there already.
 */

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import { createClient } from "@libsql/client";

const args = new Map();
for (let i = 2; i < process.argv.length; i += 1) {
  const arg = process.argv[i];
  if (!arg.startsWith("--")) continue;
  const next = process.argv[i + 1];
  args.set(arg.slice(2), next && !next.startsWith("--") ? next : "true");
}

const through = args.get("through");
if (!through) {
  console.error(
    "Pass --through with the last migration this database already reflects.",
  );
  process.exit(1);
}

const url = process.env.TURSO_DATABASE_URL;
if (!url) {
  console.error("No TURSO_DATABASE_URL. Run with: node --env-file=.env.local");
  process.exit(1);
}

const journal = JSON.parse(
  readFileSync("drizzle/meta/_journal.json", "utf8"),
);

const upTo = journal.entries.findIndex((entry) => entry.tag === through);
if (upTo === -1) {
  console.error(
    `No migration called ${through}. Known: ${journal.entries.map((e) => e.tag).join(", ")}`,
  );
  process.exit(1);
}

const applied = journal.entries.slice(0, upTo + 1);
const pending = journal.entries.slice(upTo + 1);

console.log(`database: ${url.replace(/\/\/.*@/, "//")}`);
console.log(`marking as already applied:\n  ${applied.map((e) => e.tag).join("\n  ")}`);
console.log(
  pending.length
    ? `\nleft for db:migrate:\n  ${pending.map((e) => e.tag).join("\n  ")}`
    : "\nnothing left for db:migrate",
);

if (!args.has("yes")) {
  console.log("\nDry run. Add --yes to write it.");
  process.exit(0);
}

const db = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });

const existing = await db
  .execute("select count(*) c from __drizzle_migrations")
  .catch(() => null);

if (existing && Number(existing.rows[0].c) > 0) {
  console.error(
    "\nThis database already has a migration history. Nothing written.",
  );
  process.exit(1);
}

await db.execute(
  "CREATE TABLE IF NOT EXISTS `__drizzle_migrations` (id SERIAL PRIMARY KEY, hash text NOT NULL, created_at numeric)",
);

for (const entry of applied) {
  // The same hash drizzle writes: the sha256 of the migration file itself.
  const sql = readFileSync(`drizzle/${entry.tag}.sql`, "utf8");
  const hash = createHash("sha256").update(sql).digest("hex");

  await db.execute({
    sql: "INSERT INTO `__drizzle_migrations` (hash, created_at) VALUES (?, ?)",
    args: [hash, entry.when],
  });
}

console.log(`\nWrote ${applied.length} entries. Now run: npm run db:migrate`);
