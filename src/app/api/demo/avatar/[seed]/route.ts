export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** A day: these faces never change, and the demo is opened often. */
const CACHE = "public, max-age=86400, immutable";

/**
 * Randomuser rather than pravatar, which was the first choice: pravatar cannot
 * be asked for one gender, and a demo of men's names wearing women's faces
 * reads as a bug. These portraits are addressed by gender in the path.
 */
const UPSTREAM = "https://randomuser.me/api/portraits/men";
const FACES = 100;

type Context = { params: Promise<{ seed: string }> };

/**
 * A face for the demo lineup, borrowed from randomuser.
 *
 * Proxied rather than linked because these hosts send no CORS headers: loaded
 * directly, the share card's canvas would be tainted and `toBlob` would throw
 * instead of returning a picture. Same origin here, so nothing to negotiate.
 *
 * The upstream host is fixed and the seed only ever becomes a number, so this
 * cannot be pointed at anything else.
 */
export async function GET(_request: Request, { params }: Context) {
  const { seed } = await params;

  if (!/^[a-z0-9-]{1,32}$/i.test(seed)) {
    return new Response("Bad seed", { status: 400 });
  }

  // The slug picks a portrait, and always the same one for the same player.
  let hash = 0;
  for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) % FACES;

  const upstream = await fetch(`${UPSTREAM}/${hash}.jpg`, {
    // The face for a given seed is stable, so let the platform cache it.
    next: { revalidate: 86400 },
  });

  if (!upstream.ok || !upstream.body) {
    return new Response("Upstream failed", { status: 502 });
  }

  return new Response(upstream.body, {
    headers: {
      "Content-Type": upstream.headers.get("content-type") ?? "image/jpeg",
      "Cache-Control": CACHE,
    },
  });
}
