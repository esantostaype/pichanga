import { Alert01Icon } from "@hugeicons/core-free-icons";

import { Icon } from "@/components/ui/icon";

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

/** Startup screen shown when the app has no credentials or no schema yet. */
export function SetupNotice({ detail }: { detail?: string }) {
  return (
    <main className="grid min-h-dvh place-items-center bg-background p-6">
      <div className="w-full max-w-lg space-y-5 rounded-2xl border border-border bg-card p-7">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-full bg-destructive/15 text-destructive">
            <Icon icon={Alert01Icon} size={20} />
          </span>
          <div>
            <h1 className="font-display text-xl uppercase tracking-[0.04em]">
              Environment not configured
            </h1>
            <p className="text-sm text-muted-foreground">
              The database could not be read.
            </p>
          </div>
        </div>

        <ol className="space-y-2 text-sm text-muted-foreground">
          <li>
            1. Copy <code className="text-foreground">.env.example</code> to{" "}
            <code className="text-foreground">.env.local</code> and fill in:
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
            2. Create the tables with{" "}
            <code className="text-foreground">npm run db:push</code>.
          </li>
          <li>
            3. Restart the server with{" "}
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
