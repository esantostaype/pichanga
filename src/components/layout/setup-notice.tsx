import { Alert01Icon } from "@hugeicons/core-free-icons";

import { Icon } from "@/components/ui/icon";
import { getDictionary } from "@/i18n/server";

const REQUIRED = [
  "TURSO_DATABASE_URL",
  "TURSO_AUTH_TOKEN",
  "PUSHER_APP_ID",
  "PUSHER_SECRET",
  "NEXT_PUBLIC_PUSHER_KEY",
  "NEXT_PUBLIC_PUSHER_CLUSTER",
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
];

/**
 * Startup screen shown when the app cannot read the database.
 *
 * Usually that is a missing environment, and sometimes it is a schema behind
 * the code -- a column the app selects that the database does not have yet.
 * Both are answered by the same two steps, and neither of them is `db:push`:
 * that rebuilds tables to match the schema, which on a database with rows in
 * it means losing them.
 */
export async function SetupNotice({ detail }: { detail?: string }) {
  const t = await getDictionary();

  return (
    <main className="grid min-h-dvh place-items-center bg-background p-6">
      <div className="w-full max-w-lg space-y-5 rounded-2xl border border-border bg-card p-7">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-full bg-destructive/15 text-destructive">
            <Icon icon={Alert01Icon} size={20} />
          </span>
          <div>
            <h1 className="font-display text-xl uppercase tracking-[0.04em]">
              {t.setup.title}
            </h1>
            <p className="text-sm text-muted-foreground">{t.setup.subtitle}</p>
          </div>
        </div>

        <ol className="space-y-2 text-sm text-muted-foreground">
          <li>
            1. {t.setup.copyFrom}{" "}
            <code className="text-foreground">.env.example</code>{" "}
            {t.setup.copyTo} <code className="text-foreground">.env.local</code>{" "}
            {t.setup.copyFill}
          </li>
          <li>
            <ul className="mt-1 grid grid-cols-1 gap-1 sm:grid-cols-2">
              {REQUIRED.map((key) => (
                <li
                  key={key}
                  className="rounded-lg bg-muted/50 px-2.5 py-1 font-mono text-xs text-foreground/90"
                >
                  {key}
                </li>
              ))}
            </ul>
          </li>
          <li>
            2. {t.setup.migrateWith}{" "}
            <code className="text-foreground">npm run db:migrate</code>
            {t.setup.migratePlan}{" "}
            <code className="text-foreground">npm run db:migrate:plan</code>.
          </li>
          <li>
            3. {t.setup.restartWith}{" "}
            <code className="text-foreground">npm run dev</code>.
          </li>
        </ol>

        {detail ? (
          <p className="rounded-xl border border-border bg-muted/40 p-3 font-mono text-xs text-muted-foreground">
            {detail}
          </p>
        ) : null}
      </div>
    </main>
  );
}
