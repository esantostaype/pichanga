/**
 * Minimal session auth: one shared admin password, no user table.
 *
 * Deliberately dependency-free and built on Web Crypto so the exact same code
 * runs in `proxy.ts` (Edge runtime) and in route handlers. It reads
 * `process.env` directly instead of `lib/env.ts` because that module is
 * `server-only` and pulls in Zod, neither of which belongs in the proxy.
 */

export const SESSION_COOKIE = "pichanga_session";

/** Sessions last a week; long enough that nobody re-types the password daily. */
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const encoder = new TextEncoder();

/** Auth is disabled (fail closed) unless both secrets are configured. */
export function isAuthConfigured() {
  return !!process.env.AUTH_SECRET && !!process.env.ADMIN_PASSWORD;
}

function toBase64Url(bytes: Uint8Array) {
  let binary = "";
  bytes.forEach((byte) => (binary += String.fromCharCode(byte)));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded.padEnd(Math.ceil(padded.length / 4) * 4, "="));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function hmacKey(secret: string) {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

/** Length-independent comparison, so a wrong password leaks no timing signal. */
function safeEqual(a: string, b: string) {
  const left = encoder.encode(a);
  const right = encoder.encode(b);
  let diff = left.length ^ right.length;

  for (let i = 0; i < Math.max(left.length, right.length); i++) {
    diff |= (left[i] ?? 0) ^ (right[i] ?? 0);
  }

  return diff === 0;
}

export function isAdminPassword(password: string) {
  const expected = process.env.ADMIN_PASSWORD;
  return !!expected && safeEqual(password, expected);
}

/** `<base64url payload>.<base64url hmac>` */
export async function createSessionToken(now = Date.now()) {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not configured");

  const payload = toBase64Url(
    encoder.encode(JSON.stringify({ exp: now + SESSION_TTL_MS })),
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    await hmacKey(secret),
    encoder.encode(payload),
  );

  return `${payload}.${toBase64Url(new Uint8Array(signature))}`;
}

export async function verifySessionToken(
  token: string | undefined | null,
  now = Date.now(),
): Promise<boolean> {
  const secret = process.env.AUTH_SECRET;
  if (!secret || !token) return false;

  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;

  try {
    const valid = await crypto.subtle.verify(
      "HMAC",
      await hmacKey(secret),
      fromBase64Url(signature),
      encoder.encode(payload),
    );
    if (!valid) return false;

    const { exp } = JSON.parse(
      new TextDecoder().decode(fromBase64Url(payload)),
    ) as { exp?: number };

    return typeof exp === "number" && exp > now;
  } catch {
    return false;
  }
}

export const SESSION_MAX_AGE_SECONDS = SESSION_TTL_MS / 1000;
