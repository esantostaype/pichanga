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

export type MatchSummary = {
  id: string;
  playedAt: number;
  location: string | null;
  playerCount: number;
  createdAt: number;
};

export type Match = {
  id: string;
  playedAt: number;
  location: string | null;
  createdAt: number;
  players: Player[];
};

export type ApiError = { error: string };
