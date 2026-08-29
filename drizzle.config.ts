import { readFileSync } from "node:fs";

import { defineConfig } from "drizzle-kit";

/*
 * The same precedence Next uses: `.env.local` beats `.env`, and anything
 * already in the environment beats both.
 *
 * drizzle-kit reads only `.env`, so the two tools could point at two different
 * databases while looking like they agreed -- which is exactly how a schema
 * command ends up aimed at the wrong one.
 */
function loadLocalEnv() {
  const read = (file: string): Record<string, string> => {
    try {
      const lines = readFileSync(file, "utf8").split(/\r?\n/);

      return Object.fromEntries(
        lines
          .filter((line) => line.includes("=") && !line.trim().startsWith("#"))
          .map((line) => {
            const at = line.indexOf("=");
            return [line.slice(0, at).trim(), line.slice(at + 1).trim()];
          }),
      );
    } catch {
      return {};
    }
  };

  const base = read(".env");
  const local = read(".env.local");

  for (const [key, value] of Object.entries(local)) {
    // Untouched, or holding what `.env` put there: the local file wins.
    if (!process.env[key] || process.env[key] === base[key]) {
      process.env[key] = value;
    }
  }
}

loadLocalEnv();

const url = process.env.TURSO_DATABASE_URL ?? "file:local.db";
const remote = /^(libsql|https?):/.test(url);

/*
 * A remote database needs saying out loud.
 *
 * `drizzle-kit push` diffs the schema and applies it, and in SQLite a column
 * change it cannot ALTER becomes a table rebuild: create, copy, drop. When the
 * copy does not happen the rows do not come back, and the same command that is
 * harmless against a local file empties a real one. `db:seed` has refused to
 * touch a remote database without `--yes` since the day it was written; this is
 * the same rule for the schema.
 *
 * Only `push` is held back. `db:migrate` is what should run against something
 * real -- reviewed SQL that does not decide to rebuild a table on its own --
 * and `generate` and `studio` write no schema at all.
 */
const pushing = process.argv.includes("push");

if (pushing && remote && !process.env.ALLOW_REMOTE_DB) {
  throw new Error(
    "That is a remote database. Re-run with ALLOW_REMOTE_DB=1 if you really mean it, or use db:migrate.",
  );
}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "turso",
  dbCredentials: {
    url,
    authToken: process.env.TURSO_AUTH_TOKEN,
  },
  verbose: true,
  strict: true,
});
