import { cookies } from "next/headers";
import { messages } from "@/i18n/server";
import { z } from "zod";

import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  createSessionToken,
  isAuthConfigured,
  roleForPassword,
} from "@/lib/auth";
import { fail, json, readJson, route } from "@/lib/http";

export const dynamic = "force-dynamic";

const loginSchema = z.object({
  password: z.string().min(1, "api.enterPassword"),
});

export async function POST(request: Request) {
  return route(async () => {
    if (!isAuthConfigured()) {
      return fail((await messages()).authNotConfigured, 503);
    }

    const { password } = await readJson(request, loginSchema);

    const role = roleForPassword(password);
    if (!role) return fail((await messages()).wrongPassword, 401);

    const store = await cookies();
    store.set(SESSION_COOKIE, await createSessionToken(role), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: SESSION_MAX_AGE_SECONDS,
    });

    return json({ isAdmin: true, isSuperAdmin: role === "superadmin" });
  });
}
