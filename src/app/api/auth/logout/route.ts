import { cookies } from "next/headers";

import { SESSION_COOKIE } from "@/lib/auth";
import { json, route } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function POST() {
  return route(async () => {
    const store = await cookies();
    store.delete(SESSION_COOKIE);

    return json({ isAdmin: false });
  });
}
