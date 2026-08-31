import "server-only";

import { NextResponse } from "next/server";
import { z } from "zod";

import { getDictionary } from "@/i18n/server";

export function json<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function fail(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}

function firstIssue(error: z.ZodError) {
  const issue = error.issues[0];
  if (!issue) return "Invalid data";
  const field = issue.path.join(".");
  return field ? `${field}: ${issue.message}` : issue.message;
}

/**
 * Wraps a handler to centralize error handling: Zod failures become readable
 * 422s and everything else is logged without leaking internals.
 */
export async function route(fn: () => Promise<NextResponse>) {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof z.ZodError) return fail(firstIssue(error), 422);
    console.error("[api]", error);
    return fail((await getDictionary()).common.somethingWrong, 500);
  }
}

/** Reads and validates the JSON body. */
export async function readJson<S extends z.ZodType>(
  request: Request,
  schema: S,
): Promise<z.infer<S>> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    body = {};
  }

  return schema.parse(body);
}
