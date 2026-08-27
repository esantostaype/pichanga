import type {
  Match,
  MatchSummary,
  Place,
  PlaceSuggestion,
  Player,
} from "@/types";
import type { MatchInput, PlaceInput, PlayerInput } from "./validators";

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const isForm = init?.body instanceof FormData;

  const response = await fetch(url, {
    ...init,
    cache: "no-store",
    headers: isForm
      ? init?.headers
      : { "Content-Type": "application/json", ...init?.headers },
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      (payload as { error?: string } | null)?.error ??
        "The request could not be completed",
    );
  }

  return payload as T;
}

const body = (data: unknown) => JSON.stringify(data);

type Session = { isAdmin: boolean; isSuperAdmin: boolean };

export const api = {
  auth: {
    login: (password: string) =>
      request<Session>("/api/auth/login", {
        method: "POST",
        body: body({ password }),
      }),
    logout: () => request<Session>("/api/auth/logout", { method: "POST" }),
  },

  presence: {
    /** "This tab is open." */
    beat: (id: string) =>
      request<{ ok: true }>("/api/presence", {
        method: "POST",
        body: body({ id }),
      }),
    /** Super admin only; anyone else gets a 403. */
    count: () => request<{ count: number }>("/api/presence"),
  },

  players: {
    list: () => request<Player[]>("/api/players"),
    create: (input: PlayerInput) =>
      request<Player>("/api/players", { method: "POST", body: body(input) }),
    update: (id: string, input: PlayerInput) =>
      request<Player>(`/api/players/${id}`, {
        method: "PATCH",
        body: body(input),
      }),
    remove: (id: string) =>
      request<{ id: string }>(`/api/players/${id}`, { method: "DELETE" }),
  },

  places: {
    list: () => request<Place[]>("/api/places"),
    create: (input: PlaceInput) =>
      request<Place>("/api/places", { method: "POST", body: body(input) }),
    update: (id: string, input: PlaceInput) =>
      request<Place>(`/api/places/${id}`, {
        method: "PATCH",
        body: body(input),
      }),
    remove: (id: string) =>
      request<{ id: string }>(`/api/places/${id}`, { method: "DELETE" }),

    /** Google autocomplete, proxied so the API key stays server-side. */
    search: (query: string, session: string) =>
      request<PlaceSuggestion[]>(
        `/api/places/search?q=${encodeURIComponent(query)}&session=${session}`,
      ),
    details: (googlePlaceId: string, session: string) =>
      request<PlaceInput>(
        `/api/places/search?placeId=${encodeURIComponent(googlePlaceId)}&session=${session}`,
      ),
  },

  matches: {
    list: () => request<MatchSummary[]>("/api/matches"),
    next: () => request<Match | null>("/api/matches/next"),
    get: (id: string) => request<Match>(`/api/matches/${id}`),
    create: (input: MatchInput) =>
      request<Match>("/api/matches", { method: "POST", body: body(input) }),
    update: (id: string, input: MatchInput) =>
      request<Match>(`/api/matches/${id}`, {
        method: "PATCH",
        body: body(input),
      }),
    remove: (id: string) =>
      request<{ id: string }>(`/api/matches/${id}`, { method: "DELETE" }),
    addPlayers: (id: string, playerIds: string[]) =>
      request<Match>(`/api/matches/${id}/players`, {
        method: "POST",
        body: body({ playerIds }),
      }),
    removePlayer: (id: string, playerId: string) =>
      request<Match>(`/api/matches/${id}/players/${playerId}`, {
        method: "DELETE",
      }),
  },

  uploadPhoto: (file: File) => {
    const form = new FormData();
    form.append("file", file);

    return request<{ url: string; publicId: string }>("/api/upload", {
      method: "POST",
      body: form,
    });
  },
};
