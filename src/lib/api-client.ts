import type { Stats } from "@/lib/stats";
import type {
  Match,
  MatchLive,
  MatchMedia,
  MatchSummary,
  Place,
  PlaceSuggestion,
  Player,
} from "@/types";
import type {
  MatchInput,
  MediaInput,
  PlaceInput,
  PlayerInput,
} from "./validators";

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

/**
 * Which set of rows a listing is about.
 *
 * The demo screen runs the whole app -- adding, deleting, drawing teams,
 * keeping score -- against rows marked as its own, and the real screens never
 * see them. One query parameter is what keeps the two worlds apart.
 */
const world = (demo: boolean) => (demo ? "?demo=1" : "");

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

  media: {
    list: (matchId: string) =>
      request<MatchMedia[]>(`/api/matches/${matchId}/media`),
    /** Files the browser already sent to Cloudinary. */
    add: (matchId: string, input: MediaInput) =>
      request<MatchMedia>(`/api/matches/${matchId}/media`, {
        method: "POST",
        body: body(input),
      }),
    remove: (matchId: string, mediaId: string) =>
      request<{ ok: true }>(`/api/matches/${matchId}/media/${mediaId}`, {
        method: "DELETE",
      }),
    /** Signed permission to upload straight to Cloudinary. */
    ticket: () =>
      request<{
        cloudName: string;
        apiKey: string;
        folder: string;
        timestamp: number;
        signature: string;
      }>("/api/upload/ticket", { method: "POST" }),
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
    list: (demo = false) => request<Player[]>(`/api/players${world(demo)}`),
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
    list: (demo = false) => request<Place[]>(`/api/places${world(demo)}`),
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
    list: (demo = false) =>
      request<MatchSummary[]>(`/api/matches${world(demo)}`),
    next: (demo = false) =>
      request<Match | null>(`/api/matches/next${world(demo)}`),
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
    /** Marks that player's share of the rental as settled, or not. */
    setPaid: (id: string, playerId: string, paid: boolean) =>
      request<Match>(`/api/matches/${id}/players/${playerId}`, {
        method: "PATCH",
        body: body({ paid }),
      }),
    removePlayer: (id: string, playerId: string) =>
      request<Match>(`/api/matches/${id}/players/${playerId}`, {
        method: "DELETE",
      }),
    /** Draws the sides. The same seed always draws the same ones. */
    drawTeams: (id: string, seed: number, mixAreas = false) =>
      request<Match>(`/api/matches/${id}/teams`, {
        method: "POST",
        body: body({ seed, mixAreas }),
      }),
    clearTeams: (id: string) =>
      request<Match>(`/api/matches/${id}/teams`, { method: "DELETE" }),

    /** The night itself: the games played and the goals in them. */
    live: (id: string) => request<MatchLive>(`/api/matches/${id}/live`),
    startGame: (id: string, homeTeamId: string, awayTeamId: string) =>
      request<MatchLive>(`/api/matches/${id}/live/games`, {
        method: "POST",
        body: body({ homeTeamId, awayTeamId }),
      }),
    endGame: (id: string, gameId: string) =>
      request<MatchLive>(`/api/matches/${id}/live/games/${gameId}`, {
        method: "PATCH",
      }),
    addGoal: (
      id: string,
      gameId: string,
      playerId: string,
      recordedBy: string | null,
    ) =>
      request<MatchLive>(`/api/matches/${id}/live/goals`, {
        method: "POST",
        body: body({ gameId, playerId, recordedBy }),
      }),
    /** The last whistle: ends the running game and the night with it. */
    finishNight: (id: string) =>
      request<Match>(`/api/matches/${id}/live/finish`, { method: "POST" }),
    removeGoal: (id: string, goalId: string) =>
      request<MatchLive>(`/api/matches/${id}/live/goals/${goalId}`, {
        method: "DELETE",
      }),
  },

  /** Goals, games and records across every night that has been played. */
  stats: (demo = false) => request<Stats>(`/api/stats${world(demo)}`),

  /** Wipes the sandbox and builds a fresh one. Admin only, like the page. */
  resetDemo: () => request<Match>("/api/demo/reset", { method: "POST" }),

  uploadPhoto: (file: File) => {
    const form = new FormData();
    form.append("file", file);

    return request<{ url: string; publicId: string }>("/api/upload", {
      method: "POST",
      body: form,
    });
  },
};
