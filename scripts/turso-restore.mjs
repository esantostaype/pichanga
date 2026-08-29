/**
 * Point-in-time restore for Turso, over the platform API.
 *
 * The `turso` CLI has no Windows build -- it wants WSL -- and a database that
 * needs restoring today is not the moment to install a Linux subsystem. This
 * does the same three calls over HTTPS with the Node that is already here.
 *
 *   node scripts/turso-restore.mjs --list
 *   node scripts/turso-restore.mjs --from pichanga --name pichanga-restore --at 2026-08-28T22:00:00Z
 *   node scripts/turso-restore.mjs --adopt pichanga-restore
 *
 * `--list` shows the databases and their groups. `--from/--name/--at` forks a
 * new database from how the old one looked at that moment; the recovery point
 * has to be inside the retention window -- 24 hours on the free plans, 30 days
 * on Scaler. `--adopt` mints a token for the restored copy and writes it into
 * `.env.local`, keeping a backup of the old file.
 *
 * The platform token comes from the environment and is never printed:
 *
 *   $env:TURSO_API_TOKEN = "..."      # PowerShell, this window only
 *
 * Make one at app.turso.tech under Account Settings, API Tokens. It is not the
 * same as the database token in `.env.local`.
 */

import { readFileSync, writeFileSync, copyFileSync, existsSync } from "node:fs";

const API = "https://api.turso.tech/v1";

const token = process.env.TURSO_API_TOKEN;
if (!token) {
  console.error(
    "Set TURSO_API_TOKEN first (Account Settings -> API Tokens at app.turso.tech).",
  );
  process.exit(1);
}

const args = new Map();
for (let i = 2; i < process.argv.length; i += 1) {
  const arg = process.argv[i];
  if (!arg.startsWith("--")) continue;
  const next = process.argv[i + 1];
  args.set(arg.slice(2), next && !next.startsWith("--") ? next : "true");
}

async function call(path, init = {}) {
  const response = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText} - ${text}`);
  }

  return text ? JSON.parse(text) : null;
}

/** The organization to work in: the only one, unless there are several. */
async function organization() {
  if (args.get("org")) return args.get("org");

  const orgs = await call("/organizations");
  if (orgs.length === 1) return orgs[0].slug;

  console.error(
    `Several organizations. Pass --org with one of: ${orgs.map((o) => o.slug).join(", ")}`,
  );
  process.exit(1);
}

const org = await organization();

/* --------------------------------- list --------------------------------- */

if (args.has("list")) {
  const { databases } = await call(`/organizations/${org}/databases`);

  console.log(`organization: ${org}\n`);
  for (const db of databases) {
    console.log(
      `${db.Name.padEnd(28)} group ${String(db.group).padEnd(12)} ${db.Hostname}`,
    );
  }

  process.exit(0);
}

/* -------------------------------- restore -------------------------------- */

if (args.has("from")) {
  const from = args.get("from");
  const name = args.get("name") ?? `${from}-restore`;
  const at = args.get("at");

  if (!at) {
    console.error(
      'Pass --at with the moment to restore, in UTC: --at 2026-08-28T22:00:00Z',
    );
    process.exit(1);
  }

  const { databases } = await call(`/organizations/${org}/databases`);
  const source = databases.find((db) => db.Name === from);

  if (!source) {
    console.error(`No database called ${from} in ${org}.`);
    process.exit(1);
  }

  const created = await call(`/organizations/${org}/databases`, {
    method: "POST",
    body: JSON.stringify({
      name,
      group: source.group,
      seed: { type: "database", name: from, timestamp: at },
    }),
  });

  console.log(`restored ${from} as of ${at}`);
  console.log(`new database: ${created.database?.Name ?? name}`);
  console.log(`hostname:     ${created.database?.Hostname ?? "(see dashboard)"}`);
  console.log(
    `\nCheck it holds what you expect, then adopt it:\n  node scripts/turso-restore.mjs --adopt ${name}`,
  );

  process.exit(0);
}

/* --------------------------------- adopt --------------------------------- */

if (args.has("adopt")) {
  const name = args.get("adopt");
  const { databases } = await call(`/organizations/${org}/databases`);
  const database = databases.find((db) => db.Name === name);

  if (!database) {
    console.error(`No database called ${name} in ${org}.`);
    process.exit(1);
  }

  const { jwt } = await call(
    `/organizations/${org}/databases/${name}/auth/tokens?expiration=never&authorization=full-access`,
    { method: "POST" },
  );

  const file = ".env.local";
  if (!existsSync(file)) {
    console.error("No .env.local here. Run this from the project root.");
    process.exit(1);
  }

  // The old file is kept: a bad restore should be one rename away from undone.
  copyFileSync(file, `${file}.bak`);

  const url = `libsql://${database.Hostname}`;
  const updated = readFileSync(file, "utf8")
    .split(/\r?\n/)
    .map((line) => {
      if (line.startsWith("TURSO_DATABASE_URL=")) return `TURSO_DATABASE_URL=${url}`;
      if (line.startsWith("TURSO_AUTH_TOKEN=")) return `TURSO_AUTH_TOKEN=${jwt}`;
      return line;
    })
    .join("\n");

  writeFileSync(file, updated, "utf8");

  // Nothing secret goes to the screen: the token went straight into the file.
  console.log(`.env.local now points at ${database.Hostname}`);
  console.log(`the old one is at ${file}.bak`);
  process.exit(0);
}

console.log(
  [
    "Usage:",
    "  node scripts/turso-restore.mjs --list",
    "  node scripts/turso-restore.mjs --from <db> --name <new-db> --at <ISO8601 UTC>",
    "  node scripts/turso-restore.mjs --adopt <new-db>",
  ].join("\n"),
);
