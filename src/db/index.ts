import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";

import { env } from "@/lib/env";
import * as schema from "./schema";

/**
 * The client is cached on `globalThis` so Next's dev hot-reload does not open
 * a new connection on every rebuild.
 */
const globalForDb = globalThis as unknown as {
  __pichangaClient?: ReturnType<typeof createClient>;
};

const client =
  globalForDb.__pichangaClient ??
  createClient({
    url: env.TURSO_DATABASE_URL,
    authToken: env.TURSO_AUTH_TOKEN,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__pichangaClient = client;
}

export const db = drizzle(client, { schema });
export { schema };
