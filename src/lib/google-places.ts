import "server-only";

import { env } from "@/lib/env";
import type { PlaceInput } from "@/lib/validators";
import type { PlaceSuggestion } from "@/types";

const BASE = "https://places.googleapis.com/v1";

/** The key never reaches the browser: every call goes through our API routes. */
export const isPlacesSearchEnabled = () => !!env.GOOGLE_MAPS_API_KEY;

type AutocompleteResponse = {
  suggestions?: Array<{
    placePrediction?: {
      placeId?: string;
      structuredFormat?: {
        mainText?: { text?: string };
        secondaryText?: { text?: string };
      };
      text?: { text?: string };
    };
  }>;
};

type PlaceDetailsResponse = {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  googleMapsUri?: string;
  location?: { latitude?: number; longitude?: number };
};

async function call<T>(
  path: string,
  init: RequestInit & { fieldMask?: string },
): Promise<T> {
  const { fieldMask, ...rest } = init;

  const response = await fetch(`${BASE}${path}`, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": env.GOOGLE_MAPS_API_KEY!,
      ...(fieldMask ? { "X-Goog-FieldMask": fieldMask } : {}),
      ...rest.headers,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `Google Places responded ${response.status}${detail ? `: ${detail.slice(0, 200)}` : ""}`,
    );
  }

  return (await response.json()) as T;
}

/**
 * Venue suggestions for a query.
 *
 * `sessionToken` groups the keystrokes of one search with the details lookup
 * that follows, which is what Google bills as a single session.
 */
export async function searchPlaces(
  input: string,
  sessionToken: string,
): Promise<PlaceSuggestion[]> {
  const data = await call<AutocompleteResponse>("/places:autocomplete", {
    method: "POST",
    body: JSON.stringify({ input, sessionToken }),
  });

  return (data.suggestions ?? []).flatMap((suggestion) => {
    const prediction = suggestion.placePrediction;
    if (!prediction?.placeId) return [];

    return [
      {
        googlePlaceId: prediction.placeId,
        title:
          prediction.structuredFormat?.mainText?.text ??
          prediction.text?.text ??
          "",
        subtitle: prediction.structuredFormat?.secondaryText?.text ?? "",
      },
    ];
  });
}

/** Full record for a suggestion, shaped as the place form expects it. */
export async function getPlaceDetails(
  googlePlaceId: string,
  sessionToken: string,
): Promise<PlaceInput> {
  const data = await call<PlaceDetailsResponse>(
    `/places/${encodeURIComponent(googlePlaceId)}?sessionToken=${encodeURIComponent(sessionToken)}`,
    {
      method: "GET",
      fieldMask:
        "id,displayName,formattedAddress,googleMapsUri,location",
    },
  );

  return {
    name: data.displayName?.text ?? "",
    address: data.formattedAddress ?? null,
    googlePlaceId: data.id ?? googlePlaceId,
    mapsUrl:
      data.googleMapsUri ??
      `https://www.google.com/maps/place/?q=place_id:${googlePlaceId}`,
    lat: data.location?.latitude ?? null,
    lng: data.location?.longitude ?? null,
  };
}

/** Fallback link when a place was typed by hand. */
export function mapsSearchUrl(query: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}
