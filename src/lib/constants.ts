/**
 * Age categories, the way the squad splits a league: Sub-15 (14 and under),
 * Sub-18 (15 to 17), Libre (18 to 39), Máster (40 to 49) and Súper Máster
 * (50 and over).
 *
 * Not stored. A player keeps their birthday and the category is worked out from
 * it on the day, so nobody has to remember to move a forty-year-old into
 * Máster -- the calendar does it. `from` is the age the category starts at
 * (inclusive); each runs until the next one starts.
 *
 * The labels are the league's own words and stay the same in both languages,
 * the same way a shirt number does. `edge` is what the age is worth on the
 * pitch, on the 1-5 scale of a skill: the balancer adds it to a player's
 * strength, so a side of teenagers or a side of Súper Másters is weighed as one.
 * Small on purpose -- the skills still decide, the age only tips it.
 */
export const AGE_CATEGORIES = [
  { id: "sub15", label: "Sub-15", from: 0, color: "#7dd3fc", edge: -0.4 },
  { id: "sub18", label: "Sub-18", from: 15, color: "#2dd4bf", edge: -0.15 },
  { id: "libre", label: "Libre", from: 18, color: "#c6f432", edge: 0 },
  { id: "master", label: "Máster", from: 40, color: "#fb923c", edge: -0.15 },
  {
    id: "supermaster",
    label: "Súper Máster",
    from: 50,
    color: "#f472b6",
    edge: -0.4,
  },
] as const;

/** A player with no birthday on file: neutral on the pitch, grey on screen. */
export const UNKNOWN_CATEGORY = {
  id: "unknown",
  label: "—",
  from: -1,
  color: "#a1a1aa",
  edge: 0,
} as const;

export type AgeCategory =
  | (typeof AGE_CATEGORIES)[number]
  | typeof UNKNOWN_CATEGORY;

/** The oldest anybody can be on the form; past this it is a typo. */
export const MAX_AGE = 90;

/** How close a birthday has to be for the app to say so. */
export const BIRTHDAY_NOTICE_DAYS = 7;

/**
 * Whole years since `birthDate` ("yyyy-MM-dd") on the day `today` names, also
 * "yyyy-MM-dd". Compared as dates, not milliseconds, so it turns over at
 * midnight in the app's time zone and not at whatever hour somebody was born.
 */
export function ageOn(birthDate: string | null, today: string): number | null {
  const born = parseDay(birthDate);
  const now = parseDay(today);
  if (!born || !now) return null;

  const hadBirthday =
    now.month > born.month ||
    (now.month === born.month && now.day >= born.day);

  return now.year - born.year - (hadBirthday ? 0 : 1);
}

export function categoryForAge(age: number | null): AgeCategory {
  if (age === null || age < 0) return UNKNOWN_CATEGORY;

  let found: AgeCategory = AGE_CATEGORIES[0];
  for (const category of AGE_CATEGORIES) {
    if (age >= category.from) found = category;
  }
  return found;
}

/** "yyyy-MM-dd" into its three numbers, or null when it is not one. */
export function parseDay(value: string | null | undefined) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? "");
  if (!match) return null;

  const [year, month, day] = match.slice(1).map(Number);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  return { year, month, day };
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
 * scale however they play.
 *
 * **Goalkeeping is weighted zero in every row, the keeper's included.** It is
 * not a measure of how good somebody is at football, it is the answer to one
 * question -- who goes in goal when nobody volunteers -- and letting it into
 * the average made a strong keeper read as a strong player and swung the
 * balancer with it. It is read on its own, by `pickKeeper`, and nowhere else.
 *
 * Which leaves the keeper's row judging them on the rest of their game, the
 * same 1-5 as everybody, so a side does not look weaker for having put its
 * best outfielder in goal.
 */
export const POSITION_WEIGHTS: Record<PositionId, Record<SkillId, number>> = {
  gk: {
    goalkeeping: 0,
    defending: 0.3,
    passing: 0.3,
    stamina: 0.2,
    pace: 0.2,
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

/** Teams for a venue that never said how big it is. */
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
 * The longest a finished match keeps the pitch.
 *
 * The rental is collected after the whistle, so the lineup stays visible while
 * somebody still owes money. That is the rule; this is only its ceiling, for
 * the lineup where somebody never pays up. Once the last share is ticked off
 * the match hands the screen over straight away -- see `settlingUp` in
 * `src/db/queries.ts`.
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
    venuesChanged: "venues:changed",
    lineupChanged: "lineup:changed",
    mediaChanged: "media:changed",
    /** A game started, ended, or a goal went in or came off the board. */
    liveChanged: "live:changed",
    /** One goal, so every phone at the ground can shout about it at once. */
    liveGoal: "live:goal",
  },
} as const;
