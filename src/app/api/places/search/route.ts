import {
  getPlaceDetails,
  isPlacesSearchEnabled,
  searchPlaces,
} from "@/lib/google-places";
import { fail, json, route } from "@/lib/http";

export const dynamic = "force-dynamic";

/**
 * Proxies the Google Places autocomplete so the API key stays on the server.
 *
 * `GET ?q=eureka&session=<uuid>`          -> suggestions
 * `GET ?placeId=<id>&session=<uuid>`      -> full details for one suggestion
 */
export async function GET(request: Request) {
  return route(async () => {
    if (!isPlacesSearchEnabled()) {
      return fail("Place search is not configured", 503);
    }

    const { searchParams } = new URL(request.url);
    const session = searchParams.get("session")?.trim();

    if (!session) return fail("Missing session token");

    const placeId = searchParams.get("placeId")?.trim();
    if (placeId) return json(await getPlaceDetails(placeId, session));

    const query = searchParams.get("q")?.trim();
    if (!query || query.length < 3) return json([]);

    return json(await searchPlaces(query, session));
  });
}
