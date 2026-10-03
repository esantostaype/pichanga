import { createHash, createHmac } from "node:crypto";
import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const KEY = "sig_current_test_key";

/** A token the way QStash signs one. */
function sign(body: string, key = KEY, claims: Record<string, unknown> = {}) {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(
    JSON.stringify({
      iss: "Upstash",
      sub: "https://example.com/api/push/full-time",
      exp: now + 300,
      nbf: now,
      iat: now,
      body: createHash("sha256").update(body).digest("base64url"),
      ...claims,
    }),
  ).toString("base64url");
  const signature = createHmac("sha256", key)
    .update(`${header}.${payload}`)
    .digest("base64url");
  return `${header}.${payload}.${signature}`;
}

let verifyQStash: typeof import("./push").verifyQStash;

beforeAll(async () => {
  process.env.QSTASH_CURRENT_SIGNING_KEY = KEY;
  process.env.QSTASH_NEXT_SIGNING_KEY = "sig_next_test_key";
  ({ verifyQStash } = await import("./push"));
});

describe("verifyQStash", () => {
  const body = JSON.stringify({ matchId: "m", gameId: "g" });

  it("accepts a request QStash signed", () => {
    expect(verifyQStash(sign(body), body)).toBe(true);
    expect(verifyQStash(sign(body, "sig_next_test_key"), body)).toBe(true);
  });

  it("turns away a forged signature or a changed body", () => {
    expect(verifyQStash(sign(body, "somebody_else"), body)).toBe(false);
    expect(verifyQStash(sign(body), body.replace("g", "x"))).toBe(false);
    expect(verifyQStash(null, body)).toBe(false);
  });

  it("turns away an expired token", () => {
    const old = Math.floor(Date.now() / 1000) - 10_000;
    expect(verifyQStash(sign(body, KEY, { exp: old }), body)).toBe(false);
  });
});
