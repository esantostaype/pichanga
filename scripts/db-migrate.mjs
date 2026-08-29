/**
 * Applies the pending migrations, one statement at a time, and says which one
 * broke when one does.
 *
 *   node --env-file=.env.local scripts/db-migrate.mjs
 *   node --env-file=.env.local scripts/db-migrate.mjs --yes
 *
 * `drizzle-kit migrate` does the same job, but when it fails it exits 1 behind
 * its spinner with nothing written to the terminal, which is no use at all
 * against a database somebody is waiting on. This reads the same journal, runs
 * the same SQL and writes the same history table.
 *
 * Without `--yes` it lists what it would run.
 */

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import { createClient } from "@libsql/client";

const write = process.argv.includes("--yes");

const url = process.env.TURSO_DATABASE_URL;
if (!url) {
  console.error("No TURSO_DATABASE_URL. Run with: node --env-file=.env.local");
  process.exit(1);
}

const db = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });
const journal = JSON.parse(readFileSync("drizzle/meta/_journal.json", "utf8"));

await db.execute(
  "CREATE TABLE IF NOT EXISTS `__drizzle_migrations` (id SERIAL PRIMARY KEY, hash text NOT NULL, created_at numeric)",
);

const done = await db.execute(
  "select created_at from __drizzle_migrations order by created_at desc limit 1",
);

const since = done.rows.length ? Number(done.rows[0].created_at) : 0;
const pending = journal.entries.filter((entry) => entry.when > since);

console.log(`database: ${url.replace(/^libsql:\/\//, "").split(".")[0]}`);
console.log(
  pending.length
    ? `pending:\n  ${pending.map((e) => e.tag).join("\n  ")}`
    : "nothing pending",
);

if (!pending.length) process.exit(0);

if (!write) {
  for (const entry of pending) {
    const sql = readFileSync(`drizzle/${entry.tag}.sql`, "utf8");
    const statements = sql
      .split("--> statement-breakpoint")
      .map((s) => s.trim())
      .filter(Boolean);

    console.log(`\n${entry.tag}: ${statements.length} statement(s)`);
    for (const statement of statements) {
      console.log(`  ${statement.replace(/\s+/g, " ").slice(0, 110)}`);
    }
  }

  console.log("\nDry run. Add --yes to apply.");
  process.exit(0);
}

for (const entry of pending) {
  const sql = readFileSync(`drizzle/${entry.tag}.sql`, "utf8");
  const statements = sql
    .split("--> statement-breakpoint")
    .map((s) => s.trim())
    .filter(Boolean);

  for (const [index, statement] of statements.entries()) {
    try {
      await db.execute(statement);
    } catch (error) {
      // Re-running a migration that half landed should not be a puzzle.
      const message = String(error.message ?? error);
      const harmless = /already exists|duplicate column name/i.test(message);

      if (!harmless) {
        console.error(
          `\n${entry.tag} statement ${index + 1} failed:\n  ${statement.replace(/\s+/g, " ").slice(0, 160)}\n  ${message}`,
        );
        process.exit(1);
      }

      console.log(`  (${entry.tag} statement ${index + 1} was already there)`);
    }
  }

  await db.execute({
    sql: "INSERT INTO `__drizzle_migrations` (hash, created_at) VALUES (?, ?)",
    args: [createHash("sha256").update(sql).digest("hex"), entry.when],
  });

  console.log(`applied ${entry.tag}`);
}

console.log("\nDone.");
