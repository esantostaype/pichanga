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
  /** Not from the office at all: somebody's friend, making up the numbers. */
  { id: "guest", label: "Guest", color: "#d4d4d8" },
  { id: "other", label: "Other", color: "#a1a1aa" },
] as const;

export type AreaId = (typeof AREAS)[number]["id"];

export const AREA_IDS = AREAS.map((a) => a.id) as [AreaId, ...AreaId[]];

const AREA_MAP = new Map(AREAS.map((a) => [a.id, a]));

export function getArea(id: string) {
  return AREA_MAP.get(id as AreaId) ?? AREAS[AREAS.length - 1];
}

/**
 * Where somebody wants to play. It is not only a label: it decides which of
 * their skills count towards how strong they are, so a defender is never
 * marked down for not finishing.
 */
export const POSITIONS = [
  { id: "gk", label: "Goalkeeper", short: "GK" },
  { id: "def", label: "Defender", short: "DEF" },
  { id: "mid", label: "Midfielder", short: "MID" },
  { id: "fwd", label: "Forward", short: "FWD" },
] as const;

export type PositionId = (typeof POSITIONS)[number]["id"];

export const POSITION_IDS = POSITIONS.map((p) => p.id) as [
  PositionId,
  ...PositionId[],
];

const POSITION_MAP = new Map(POSITIONS.map((p) => [p.id, p]));

export function getPosition(id: string) {
  return POSITION_MAP.get(id as PositionId) ?? POSITIONS[2];
}

/**
 * The six numbers behind a player, each 1 to 5.
 *
 * Six and no more: every one of them is a value somebody has to set for twenty
 * people, and a seventh would be the one nobody fills in. They all start at 3,
 * so an unrated player is an average one and the organizer only has to touch
 * the handful who are not.
 */
export const SKILLS = [
  { id: "pace", label: "Pace" },
  { id: "stamina", label: "Stamina" },
  { id: "finishing", label: "Finishing" },
  { id: "passing", label: "Passing" },
  { id: "defending", label: "Defending" },
  { id: "goalkeeping", label: "Goalkeeping" },
] as const;

export type SkillId = (typeof SKILLS)[number]["id"];

export const SKILL_MIN = 1;
export const SKILL_MAX = 5;
export const SKILL_DEFAULT = 3;

/**
 * What each position is worth, as weights over the six skills.
 *
 * They sum to 1 per position, so every player's strength lands on the same 1-5
 * scale however they play. The keeper's row is the reason the goalkeeping skill
 * exists at all: everybody has it, and it decides who goes in goal on the day
 * nobody volunteers.
 */
export const POSITION_WEIGHTS: Record<PositionId, Record<SkillId, number>> = {
  gk: {
    goalkeeping: 0.6,
    pace: 0.1,
    stamina: 0.1,
    passing: 0.1,
    defending: 0.1,
    finishing: 0,
  },
  def: {
    defending: 0.4,
    stamina: 0.25,
    pace: 0.2,
    passing: 0.15,
    finishing: 0,
    goalkeeping: 0,
  },
  mid: {
    passing: 0.35,
    stamina: 0.3,
    pace: 0.2,
    finishing: 0.15,
    defending: 0,
    goalkeeping: 0,
  },
  fwd: {
    finishing: 0.4,
    pace: 0.35,
    passing: 0.15,
    stamina: 0.1,
    defending: 0,
    goalkeeping: 0,
  },
};

/**
 * How many a side the pitch takes. Rented pitches come in these sizes, and it
 * is what decides whether twenty people are two teams or three.
 */
export const PITCH_FORMATS = [5, 6, 7, 9, 11] as const;

export type PitchFormat = (typeof PITCH_FORMATS)[number];

/**
 * The pool the drawn teams are named from.
 *
 * Every one of them has to work as a crest, which is a harder test than being
 * funny in a list: a short badge, a colour, and something readable from across
 * a pitch. They are named after the floors the squad comes off -- the people
 * who write the code, the ones who read the numbers, the ones who make it look
 * like something -- so a side reads as a side and not as an in-joke.
 *
 * The colour belongs to the name, so a side is the same colour every week --
 * and the six are spread as far around the wheel as six hues get, because two
 * teams a shade apart is two teams nobody can tell apart from the touchline.
 *
 * A name and its colour are copied onto the team row when the sides are drawn,
 * so changing this list renames nothing that has already been played.
 */
export const TEAM_NAMES = [
  { name: "Code FC", badge: "CF", accent: "#c6f432" },
  { name: "Full Stack United", badge: "FS", accent: "#a78bfa" },
  { name: "Data Miners FC", badge: "DM", accent: "#38bdf8" },
  { name: "Analytics City", badge: "AC", accent: "#fb923c" },
  { name: "Creative United", badge: "CU", accent: "#f472b6" },
  { name: "Brand Builders", badge: "BB", accent: "#4ade80" },
] as const;

/**
 * How long before kick-off the teams can be drawn.
 *
 * Early enough that nobody is standing on the pitch waiting for it, late enough
 * that the lineup is settled: two hours before is when people stop dropping out
 * and start asking who they are playing with.
 */
export const TEAMS_OPEN_MS = 2 * 60 * 60 * 1000;

/** Teams for a place that never said how big it is. */
export const DEFAULT_PITCH_FORMAT = 7;

/**
 * How long a game runs before the sides change, for a night nobody agreed one
 * for. Ten minutes is what an office plays: long enough to be a game, short
 * enough that the side waiting is not waiting.
 */
export const DEFAULT_GAME_MINUTES = 10;

/** What the night can be set to. Anything else is somebody else's sport. */
export const GAME_MINUTES_CHOICES = [5, 8, 10, 12, 15, 20] as const;

/**
 * No clock: the game runs as long as the match does.
 *
 * Only offered with two sides, because with three there is somebody waiting
 * and a game that never ends is a side that never plays.
 */
export const INDEFINITE_GAME = 0;

/**
 * How long the form assumes a match runs when you pick a start time.
 *
 * A rented pitch comes by the hour, so moving the kick-off moves the whistle
 * with it. Typing over it still works -- the assumption is only ever the
 * starting point.
 */
export const SUGGESTED_MATCH_LENGTH_MS = 60 * 60 * 1000;

/** Fallback length for a match with no explicit end time. */
export const DEFAULT_MATCH_DURATION_MS = 90 * 60 * 1000;

/**
 * How long a finished match keeps the pitch. The rental is collected after the
 * whistle, so the lineup has to stay visible while somebody still owes money;
 * only then does the next fixture take over.
 */
export const MATCH_GRACE_MS = 3 * 24 * 60 * 60 * 1000;

/** Photo rules, shared by client and server. */
export const MAX_PHOTO_BYTES = 6 * 1024 * 1024;
export const ACCEPTED_PHOTO_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
];
export const ACCEPTED_PHOTO_ACCEPT = ACCEPTED_PHOTO_TYPES.join(",");

/**
 * Live count of open tabs. Each one beats on a timer and counts as present
 * while its last beat is inside the window.
 *
 * The window is far wider than the beat because a browser throttles timers in
 * a background tab to about one a minute: without the slack those tabs would
 * flicker in and out of the count. A tab that is closed properly says so on
 * the way out, so the slack only delays crashes and lost connections.
 */
export const PRESENCE = {
  beatMs: 20_000,
  windowMs: 120_000,
  /** How often the super admin's counter refreshes. */
  pollMs: 10_000,
  /** Rows older than this are swept: the table holds the crowd, not history. */
  staleMs: 10 * 60_000,
} as const;

/**
 * Match gallery. Files go straight from the browser to Cloudinary, so these
 * caps are enforced before the upload starts rather than at our own door.
 */
export const GALLERY = {
  imageTypes: ACCEPTED_PHOTO_TYPES,
  videoTypes: ["video/mp4", "video/webm", "video/quicktime"],
  maxImageBytes: 10 * 1024 * 1024,
  maxVideoBytes: 100 * 1024 * 1024,
} as const;

export const GALLERY_ACCEPT = [
  ...GALLERY.imageTypes,
  ...GALLERY.videoTypes,
].join(",");

/** Pusher channel and events. */
export const REALTIME = {
  channel: "pichanga",
  events: {
    matchesChanged: "matches:changed",
    playersChanged: "players:changed",
    placesChanged: "places:changed",
    lineupChanged: "lineup:changed",
    mediaChanged: "media:changed",
    /** A game started, ended, or a goal went in or came off the board. */
    liveChanged: "live:changed",
    /** One goal, so every phone at the ground can shout about it at once. */
    liveGoal: "live:goal",
  },
} as const;
