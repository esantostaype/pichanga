/** Company areas. The stored value is the `id`. */
export const AREAS = [
  { id: "data", label: "Data", color: "#7dd3fc" },
  { id: "dev", label: "Dev", color: "#c6f432" },
  { id: "it", label: "IT", color: "#a78bfa" },
  { id: "marketing", label: "Marketing", color: "#fb923c" },
  { id: "sales", label: "Sales", color: "#f472b6" },
  { id: "product", label: "Product", color: "#2dd4bf" },
  { id: "design", label: "Design", color: "#fbbf24" },
  { id: "finance", label: "Finance", color: "#34d399" },
  { id: "hr", label: "HR", color: "#f87171" },
  { id: "legal", label: "Legal", color: "#94a3b8" },
  { id: "operations", label: "Operations", color: "#60a5fa" },
  { id: "support", label: "Support", color: "#e879f9" },
  { id: "management", label: "Management", color: "#facc15" },
  { id: "other", label: "Other", color: "#a1a1aa" },
] as const;

export type AreaId = (typeof AREAS)[number]["id"];

export const AREA_IDS = AREAS.map((a) => a.id) as [AreaId, ...AreaId[]];

const AREA_MAP = new Map(AREAS.map((a) => [a.id, a]));

export function getArea(id: string) {
  return AREA_MAP.get(id as AreaId) ?? AREAS[AREAS.length - 1];
}

/** Fallback length for a match with no explicit end time. */
export const DEFAULT_MATCH_DURATION_MS = 90 * 60 * 1000;

/** Photo rules, shared by client and server. */
export const MAX_PHOTO_BYTES = 6 * 1024 * 1024;
export const ACCEPTED_PHOTO_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
];
export const ACCEPTED_PHOTO_ACCEPT = ACCEPTED_PHOTO_TYPES.join(",");

/** Pusher channel and events. */
export const REALTIME = {
  channel: "pichanga",
  events: {
    matchesChanged: "matches:changed",
    playersChanged: "players:changed",
    placesChanged: "places:changed",
    lineupChanged: "lineup:changed",
  },
} as const;
