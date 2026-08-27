import type { Place } from "@/types";

/**
 * The link to send for a venue: whatever Google gave us, in full.
 *
 * These run past 130 characters -- a `cid` and a signed `g_mp` blob -- and
 * WhatsApp prints every one of them above the preview. It was shortened twice
 * and put back both times: coordinates lose the card altogether, and the bare
 * `cid` only reaches the same page through a redirect, which the crawler does
 * not follow. The long link is what draws the venue's photo, name and rating in
 * the chat, and that card is the whole point of sending it.
 */
export function placeMapsUrl(place: Place | null | undefined) {
  if (!place) return null;
  if (place.mapsUrl) return place.mapsUrl;

  if (place.googlePlaceId) {
    return `https://www.google.com/maps/place/?q=place_id:${place.googlePlaceId}`;
  }

  return place.name
    ? `https://maps.google.com/?q=${encodeURIComponent(place.name)}`
    : null;
}
