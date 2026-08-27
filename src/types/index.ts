export type Player = {
  id: string;
  firstName: string;
  lastName: string;
  area: string;
  photoUrl: string | null;
  photoPublicId: string | null;
  /** epoch ms, serializable across the server/client boundary */
  createdAt: number;
};

export type Place = {
  id: string;
  name: string;
  address: string | null;
  googlePlaceId: string | null;
  mapsUrl: string | null;
  /** Rental price for one match, split across whoever plays. */
  price: number | null;
  lat: number | null;
  lng: number | null;
  createdAt: number;
};

/** Only `weekly` for now; the column is text so more rules can be added. */
export type Recurrence = "weekly";

export type MatchSummary = {
  id: string;
  playedAt: number;
  endsAt: number;
  place: Place | null;
  /** Player running the match; their token wears the crown. */
  organizerId: string | null;
  recurrence: Recurrence | null;
  seriesId: string | null;
  playerCount: number;
  createdAt: number;
};

export type Match = {
  id: string;
  playedAt: number;
  endsAt: number;
  place: Place | null;
  organizerId: string | null;
  recurrence: Recurrence | null;
  seriesId: string | null;
  createdAt: number;
  players: Player[];
};

/** A venue suggestion coming from the Google Places autocomplete. */
export type PlaceSuggestion = {
  googlePlaceId: string;
  title: string;
  subtitle: string;
};

export type ApiError = { error: string };
