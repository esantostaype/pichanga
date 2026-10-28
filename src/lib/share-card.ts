"use client";

import { formatLongDate, formatTimeRange } from "./date";
import { formatMoney, rentalShare } from "./money";
import { thumbUrl } from "./media-url";
import { venueMapsUrl } from "./maps";
import { whereLabel } from "./venue";
import { badgeFor } from "./teams";
import { initialsOf } from "./utils";
import { nightAccounts, type LedgerRow, type NightMoney } from "./prize";
import type { Match, MatchLive, Player } from "@/types";
import { categoryOf } from "./age";

/**
 * The match, as one tall image to send to a chat.
 *
 * Drawn in the browser rather than rendered on the server: the fonts are
 * already loaded here, Cloudinary serves the photos with `Access-Control-
 * Allow-Origin: *` so the canvas stays untainted, and nobody pays for a
 * serverless invocation every time somebody wants to share a lineup.
 */

/** Layout in CSS pixels; everything is multiplied by `SCALE` on the way out. */
const W = 900;
const PAD = 56;
const SCALE = 2;

const ROW_H = 104;
const PHOTO = 68;
const GAP = 28;

/** Two to a row, always: one player alone is the only exception. */
const COLUMNS = 2;

const INK = "#f5f7f2";
const MUTED = "#9aa295";
const BG = "#0b0c0d";
const CARD = "#141617";
const LIME = "#c6f432";
const PAID = "#22c55e";
const OWING = "#ef4444";

type Loaded = { player: Player; image: HTMLImageElement | null };

/** Loads a photo for the canvas, or reports that there is none to draw. */
function loadPhoto(player: Player): Promise<Loaded> {
  return new Promise((resolve) => {
    if (!player.photoUrl) return resolve({ player, image: null });

    const image = new Image();
    // Cloudinary allows this, and without it the canvas would be tainted and
    // `toBlob` would throw instead of returning a file.
    image.crossOrigin = "anonymous";
    image.onload = () => resolve({ player, image });
    image.onerror = () => resolve({ player, image: null });
    image.src = thumbUrl(player.photoUrl);
  });
}

function loadLogo(): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = "/images/logo.svg";
  });
}

/** Cuts a string to fit, with an ellipsis, measuring as it goes. */
function fit(ctx: CanvasRenderingContext2D, text: string, max: number) {
  if (ctx.measureText(text).width <= max) return text;

  let cut = text;
  while (cut.length > 1 && ctx.measureText(`${cut}...`).width > max) {
    cut = cut.slice(0, -1);
  }
  return `${cut.trim()}...`;
}

function circle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
) {
  ctx.beginPath();
  ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
  ctx.closePath();
}

/**
 * What the card and the message are about.
 *
 * Both carry the same match and the same squad -- what changes is the subject.
 * `match` is the fixture: where, when, and who is playing. `payments` is the
 * ledger: the same names with a tick or an hourglass against each one, and the
 * count of what is still owed.
 *
 * They are two different messages to send, not one message with a filter on it,
 * which is why neither leaves anybody out.
 */
export type ShareScope = "match" | "payments";

/** The handful of words the card and the message put around the numbers. */
export type ShareWords = {
  cardPitch: string;
  cardTotalLine: string;
  cardEachLine: string;
  cardPaidLine: string;
  cardPendingLine: string;
  cardOnPitch: string;
  cardAllPaid: string;
  cardOwing: string;
  cardOrganizer: string;
};

const DEFAULT_WORDS: ShareWords = {
  cardPitch: "{total} the pitch, {each} each",
  cardTotalLine: "{money} the pitch",
  cardEachLine: "{money} each",
  cardPaidLine: "{count} paid",
  cardPendingLine: "{count} pending{money}",
  cardOnPitch: "{count} on the pitch",
  cardAllPaid: "Everybody has paid",
  cardOwing: "{paid} paid, {owing} pending{money}",
  cardOrganizer: " (organizer)",
};

const fillWords = (line: string, values: Record<string, string | number>) =>
  line.replace(/\{(\w+)\}/g, (whole, key: string) =>
    key in values ? String(values[key]) : whole,
  );

/**
 * Draws the whole card and hands back a file ready to download or share.
 *
 * JPEG rather than PNG: the same picture is a few hundred kilobytes instead of
 * several megabytes, and every chat app recompresses it anyway.
 */
export async function renderMatchCard(
  match: Match,
  scope: ShareScope = "match",
  words: ShareWords = DEFAULT_WORDS,
  lang: "en" | "es" = "en",
): Promise<Blob> {
  const players = match.players;
  const paid = new Set(match.paidPlayerIds);
  const paying = scope === "payments";
  const columns = Math.min(COLUMNS, Math.max(players.length, 1));
  const rows = Math.ceil(players.length / columns);

  // The fixture card carries neither the split nor the line about who has
  // settled up, so it is shorter by exactly those two lines.
  const headerH = paying ? 348 : 262;
  const footerH = PAD;
  const height = headerH + rows * ROW_H + footerH;

  const canvas = document.createElement("canvas");
  canvas.width = W * SCALE;
  canvas.height = height * SCALE;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("This browser cannot draw the card");

  ctx.scale(SCALE, SCALE);

  // The app's own faces, already loaded by the page around us.
  if (document.fonts?.ready) await document.fonts.ready;

  const [logo, loaded] = await Promise.all([
    loadLogo(),
    Promise.all(players.map(loadPhoto)),
  ]);

  /* ------------------------------ background ----------------------------- */

  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, height);

  /* -------------------------------- header ------------------------------- */

  let y = PAD;

  if (logo) {
    const logoW = 200;
    const logoH = (logo.height / logo.width) * logoW;
    ctx.drawImage(logo, PAD, y, logoW, logoH);
    y += logoH + 34;
  }

  ctx.fillStyle = INK;
  ctx.font = `600 46px "Sofia Sans Extra Condensed", "Sofia Sans", sans-serif`;
  ctx.fillText(formatLongDate(match.playedAt, lang).toUpperCase(), PAD, y + 34);
  y += 74;

  ctx.fillStyle = MUTED;
  ctx.font = `400 26px "Sofia Sans", sans-serif`;

  const facts = [
    formatTimeRange(match.playedAt, match.endsAt),
    whereLabel(match),
    fillWords(words.cardOnPitch, { count: players.length }),
  ].filter(Boolean) as string[];

  ctx.fillText(fit(ctx, facts.join("   ·   "), W - PAD * 2), PAD, y + 20);
  y += 46;

  // What it costs each of them is the ledger's business, not the fixture's.
  const share = rentalShare(match);
  if (paying) {
    const total = match.venue?.price ?? null;

    if (total !== null && share !== null) {
      ctx.font = `600 30px "Sofia Sans", sans-serif`;

      // The whole rental first: it is the number the venue is owed, and every
      // share below is a slice of it.
      ctx.fillStyle = INK;
      const totalLabel = fillWords(words.cardTotalLine, {
        money: formatMoney(total),
      });
      ctx.fillText(totalLabel, PAD, y + 24);

      let at = PAD + ctx.measureText(totalLabel).width;
      ctx.fillStyle = MUTED;
      ctx.fillText("   ·   ", at, y + 24);
      at += ctx.measureText("   ·   ").width;

      ctx.fillStyle = LIME;
      ctx.fillText(
        fillWords(words.cardEachLine, { money: formatMoney(share) }),
        at,
        y + 24,
      );
    }

    y += 44;
  }

  // Where the rental stands, in one line. Only the ledger asks.
  if (paying) {
    const owing = players.length - paid.size;
    ctx.font = `500 25px "Sofia Sans", sans-serif`;

    ctx.fillStyle = PAID;
    const paidLabel = fillWords(words.cardPaidLine, { count: paid.size });
    ctx.fillText(paidLabel, PAD, y + 22);

    if (owing > 0) {
      const at = PAD + ctx.measureText(paidLabel).width;
      ctx.fillStyle = MUTED;
      ctx.fillText("   ·   ", at, y + 22);
      ctx.fillStyle = OWING;
      ctx.fillText(
        fillWords(words.cardPendingLine, {
          count: owing,
          money: share === null ? "" : ` (${formatMoney(share * owing)})`,
        }),
        at + ctx.measureText("   ·   ").width,
        y + 22,
      );
    }
  }

  y = headerH;

  /* ------------------------------- the list ------------------------------ */

  const colW = (W - PAD * 2) / columns;

  loaded.forEach((entry, index) => {
    // Row by row, so the pair on a line are the two next to each other in the
    // lineup rather than one from each half of it.
    const column = index % columns;
    const row = Math.floor(index / columns);

    const x = PAD + column * colW;
    const top = y + row * ROW_H;

    // A card behind each player, so the rows read as a list and not as text.
    ctx.fillStyle = CARD;
    ctx.beginPath();
    ctx.roundRect(x, top, colW - 16, ROW_H - 14, 18);
    ctx.fill();

    const photoX = x + 16;
    const photoY = top + (ROW_H - 14 - PHOTO) / 2;
    const { player, image } = entry;
    const category = categoryOf(player.birthDate);

    ctx.save();
    circle(ctx, photoX, photoY, PHOTO);
    ctx.clip();

    if (image) {
      ctx.drawImage(image, photoX, photoY, PHOTO, PHOTO);
    } else {
      ctx.fillStyle = "#22262a";
      ctx.fillRect(photoX, photoY, PHOTO, PHOTO);
      ctx.fillStyle = MUTED;
      ctx.font = `600 26px "Sofia Sans", sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText(
        initialsOf(player.firstName, player.lastName),
        photoX + PHOTO / 2,
        photoY + PHOTO / 2 + 9,
      );
      ctx.textAlign = "left";
    }

    ctx.restore();

    // The age category colour as a ring, the way the pitch tokens are outlined.
    ctx.strokeStyle = category.color;
    ctx.lineWidth = 3;
    circle(ctx, photoX, photoY, PHOTO);
    ctx.stroke();

    const textX = photoX + PHOTO + GAP;
    // Room on the right for the mark that says whether they have paid, which
    // only the ledger draws: the fixture card is not about the money.
    const textW = colW - 16 - (textX - x) - (paying ? 66 : 16);

    if (paying) {
      drawPaidMark(
        ctx,
        x + colW - 16 - 44,
        top + (ROW_H - 14) / 2,
        paid.has(player.id),
      );
    }

    // The organizer wears the crown here too, the way they do on the pitch.
    const organizing = player.id === match.organizerId;
    const crownW = organizing ? 30 : 0;

    ctx.fillStyle = INK;
    ctx.font = `600 27px "Sofia Sans", sans-serif`;
    const name = fit(
      ctx,
      `${player.firstName} ${player.lastName}`,
      textW - crownW,
    );
    ctx.fillText(name, textX, top + 40);

    if (organizing) {
      drawCrown(ctx, textX + ctx.measureText(name).width + 10, top + 32);
    }

    ctx.fillStyle = category.color;
    ctx.font = `500 22px "Sofia Sans", sans-serif`;
    ctx.fillText(fit(ctx, category.label.toUpperCase(), textW), textX, top + 70);
  });

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error("The card could not be drawn")),
      "image/jpeg",
      0.94,
    );
  });
}

/** A small crown, for whoever is running the match. */
function drawCrown(ctx: CanvasRenderingContext2D, x: number, y: number) {
  const w = 20;
  const h = 14;

  ctx.fillStyle = LIME;
  ctx.beginPath();
  ctx.moveTo(x, y + h);
  ctx.lineTo(x, y + 2);
  ctx.lineTo(x + w * 0.25, y + h * 0.6);
  ctx.lineTo(x + w * 0.5, y);
  ctx.lineTo(x + w * 0.75, y + h * 0.6);
  ctx.lineTo(x + w, y + 2);
  ctx.lineTo(x + w, y + h);
  ctx.closePath();
  ctx.fill();
}

/**
 * Whether this player has settled: a filled tick, or a hollow ring with a
 * cross. The same two states the pitch shows, drawn with strokes because a
 * canvas has no icons.
 */
function drawPaidMark(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  settled: boolean,
) {
  const r = 15;

  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);

  if (settled) {
    ctx.fillStyle = PAID;
    ctx.fill();
  } else {
    ctx.strokeStyle = OWING;
    ctx.lineWidth = 2.5;
    ctx.stroke();
  }

  ctx.strokeStyle = settled ? "#0b0c0d" : OWING;
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();

  if (settled) {
    ctx.moveTo(cx - 6.5, cy);
    ctx.lineTo(cx - 1.5, cy + 5);
    ctx.lineTo(cx + 7, cy - 5.5);
  } else {
    ctx.moveTo(cx - 5, cy - 5);
    ctx.lineTo(cx + 5, cy + 5);
    ctx.moveTo(cx + 5, cy - 5);
    ctx.lineTo(cx - 5, cy + 5);
  }

  ctx.stroke();
}

/** The same information as a message, for a chat that wants text. */
export function matchShareText(
  match: Match,
  scope: ShareScope = "match",
  words: ShareWords = DEFAULT_WORDS,
  lang: "en" | "es" = "en",
) {
  const paying = scope === "payments";
  const players = match.players;
  const share = rentalShare(match);

  const where = whereLabel(match);

  const lines = [
    `*${formatLongDate(match.playedAt, lang)}*`,
    `${formatTimeRange(match.playedAt, match.endsAt)}${where ? ` · ${where}` : ""}`,
  ];

  const total = match.venue?.price ?? null;
  if (paying && total !== null && share !== null) {
    lines.push(
      fillWords(words.cardPitch, {
        total: formatMoney(total),
        each: formatMoney(share),
      }),
    );
  }
  const maps = paying ? null : venueMapsUrl(match.venue);
  if (maps) lines.push(maps);

  const paid = new Set(match.paidPlayerIds);
  const owing = players.length - paid.size;

  lines.push("");
  lines.push(`*${fillWords(words.cardOnPitch, { count: players.length })}*`);

  if (paying) {
    lines.push(
      owing === 0
        ? words.cardAllPaid
        : fillWords(words.cardOwing, {
            paid: paid.size,
            owing,
            money: share === null ? "" : ` (${formatMoney(share * owing)})`,
          }),
    );
  }

  lines.push("");

  players.forEach((player, index) => {
    const crown = player.id === match.organizerId ? words.cardOrganizer : "";
    // Ticks belong to the ledger. On the fixture they would start an argument
    // about money in a message that was only saying who is playing.
    const mark = paying ? `${paid.has(player.id) ? "✅" : "⏳"} ` : "";
    lines.push(
      `${mark}${index + 1}. ${player.firstName} ${player.lastName}${crown}`,
    );
  });

  return lines.join("\n");
}

/* ------------------------- the preview, as a card ------------------------ */

/** One side of a preview draw, which exists only in the browser that drew it. */
export type PreviewSide = {
  name: string;
  accent: string;
  players: Player[];
  keeperId: string | null;
  borrowedKeeper: boolean;
};

/** The words the preview card puts around the names. */
export type PreviewWords = {
  /** Already filled in: "The teams are drawn for real in 2 days", or empty. */
  opens: string;
  moving: string;
  tag: string;
  onPitch: string;
  keeper: string;
  inGoal: string;
};

/**
 * Breaks a string into at most `lines` lines that fit.
 *
 * The last line allowed takes everything still unplaced and is cut with an
 * ellipsis, so a caveat that runs long ends visibly rather than in mid-air.
 */
function wrap(
  ctx: CanvasRenderingContext2D,
  text: string,
  max: number,
  lines: number,
) {
  const words = text.split(/\s+/).filter(Boolean);
  const out: string[] = [];
  let start = 0;
  let line = "";

  for (let i = 0; i < words.length; i += 1) {
    const next = line ? `${line} ${words[i]}` : words[i];

    if (ctx.measureText(next).width <= max) {
      line = next;
      continue;
    }

    if (out.length === lines - 1) {
      return [...out, fit(ctx, words.slice(start).join(" "), max)];
    }

    out.push(line);
    start = i;
    line = words[i];
  }

  if (line) out.push(line);
  return out;
}

/** The crest, as a canvas path rather than the svg the screen draws. */
function drawCrest(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  accent: string,
  name: string,
) {
  // The same shield as `TeamCrest`, whose path is drawn on a 48x56 box.
  const shield = new Path2D("M24 1 46 8v22c0 12-9 20-22 25C11 50 2 42 2 30V8Z");

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 48, size / 48);

  ctx.fillStyle = `${accent}29`;
  ctx.fill(shield);
  ctx.strokeStyle = accent;
  ctx.lineWidth = 2.5;
  ctx.lineJoin = "round";
  ctx.stroke(shield);

  ctx.fillStyle = accent;
  ctx.font = `700 28px "Sofia Sans Extra Condensed", "Sofia Sans", sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText(badgeFor(name), 24, 35);
  ctx.textAlign = "left";

  ctx.restore();
}

/**
 * The preview draw, as one image to drop into a chat.
 *
 * Deliberately not the same picture as `renderMatchCard`: that one is the
 * fixture and this one is a guess, and the two landing in the same chat an hour
 * apart is exactly how somebody turns up expecting to play with the wrong five.
 * So the tag sits on the card and not only in the dialog -- dashed edges, the
 * word on every side, the line saying when the real draw happens -- because the
 * picture is what gets forwarded and the dialog around it is not.
 */
export async function renderTeamsPreviewCard(
  match: Match,
  sides: PreviewSide[],
  words: PreviewWords,
  lang: "en" | "es" = "en",
): Promise<Blob> {
  const squad = sides.flatMap((side) => side.players);

  const columns = Math.min(Math.max(sides.length, 1), 3);
  const gridRows = Math.ceil(Math.max(sides.length, 1) / columns);

  const COL_GAP = 20;
  const colW = (W - PAD * 2 - COL_GAP * (columns - 1)) / columns;

  // Three sides across 900px is a narrow column, so the rows tighten rather
  // than every surname getting cut off halfway through.
  const tight = columns >= 3;
  const photo = tight ? 34 : 42;
  const rowH = tight ? 50 : 58;
  const blockHead = tight ? 76 : 84;
  const blockFoot = 18;

  const heightOf = (side: PreviewSide) =>
    blockHead + side.players.length * rowH + blockFoot;

  const rowHeights = Array.from({ length: gridRows }, (_, row) =>
    Math.max(
      0,
      ...sides.slice(row * columns, row * columns + columns).map(heightOf),
    ),
  );

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("This browser cannot draw the card");

  // The app's own faces, already loaded by the page around us. Awaited before
  // anything is measured: the caveat wraps to however many lines it wraps to,
  // and the canvas has to be tall enough for them before a pixel is drawn.
  if (document.fonts?.ready) await document.fonts.ready;

  ctx.font = `400 22px "Sofia Sans", sans-serif`;
  const caveat = wrap(ctx, words.moving, W - PAD * 2 - 32, 2);

  const stripH = 64 + caveat.length * 28;
  const headerH = PAD + 86 + 74 + 46 + stripH;
  const gridH =
    rowHeights.reduce((total, one) => total + one, 0) +
    COL_GAP * (gridRows - 1);
  const height = headerH + gridH + PAD;

  canvas.width = W * SCALE;
  canvas.height = height * SCALE;
  // Sizing a canvas resets its context, so the scale goes on afterwards.
  ctx.scale(SCALE, SCALE);

  const [logo, loaded] = await Promise.all([
    loadLogo(),
    Promise.all(squad.map(loadPhoto)),
  ]);

  const photos = new Map(
    loaded.map((entry) => [entry.player.id, entry.image] as const),
  );

  /* ------------------------------ background ----------------------------- */

  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, height);

  /* -------------------------------- header ------------------------------- */

  let y = PAD;

  if (logo) {
    const logoW = 200;
    ctx.drawImage(logo, PAD, y, logoW, (logo.height / logo.width) * logoW);
  }
  y += 86;

  ctx.fillStyle = INK;
  ctx.font = `600 46px "Sofia Sans Extra Condensed", "Sofia Sans", sans-serif`;
  ctx.fillText(formatLongDate(match.playedAt, lang).toUpperCase(), PAD, y + 34);
  y += 74;

  ctx.fillStyle = MUTED;
  ctx.font = `400 26px "Sofia Sans", sans-serif`;

  const facts = [
    formatTimeRange(match.playedAt, match.endsAt),
    whereLabel(match),
    fillWords(words.onPitch, { count: squad.length }),
  ].filter(Boolean) as string[];

  ctx.fillText(fit(ctx, facts.join("   ·   "), W - PAD * 2), PAD, y + 20);
  y += 46;

  /* --------------------------- what this is not --------------------------- */

  ctx.fillStyle = `${LIME}14`;
  ctx.beginPath();
  ctx.roundRect(PAD, y, W - PAD * 2, stripH - 22, 18);
  ctx.fill();

  ctx.font = `700 22px "Sofia Sans", sans-serif`;
  const tag = words.tag.toUpperCase();
  const tagW = ctx.measureText(tag).width;
  ctx.fillStyle = LIME;
  ctx.fillText(tag, PAD + 16, y + 34);

  if (words.opens) {
    const at = PAD + 16 + tagW + 18;
    ctx.fillStyle = INK;
    ctx.font = `500 22px "Sofia Sans", sans-serif`;
    ctx.fillText(fit(ctx, words.opens, W - PAD - 16 - at), at, y + 34);
  }

  ctx.fillStyle = MUTED;
  ctx.font = `400 22px "Sofia Sans", sans-serif`;
  caveat.forEach((line, index) => {
    ctx.fillText(line, PAD + 16, y + 66 + index * 28);
  });

  /* ------------------------------- the sides ------------------------------ */

  y = headerH;

  sides.forEach((side, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);

    const x = PAD + column * (colW + COL_GAP);
    const top =
      y +
      rowHeights.slice(0, row).reduce((total, one) => total + one, 0) +
      COL_GAP * row;

    // Dashed and faintly tinted, the way the dialog draws a side that is not
    // real yet. It is the whole difference between this card and the other one.
    ctx.fillStyle = `${side.accent}0f`;
    ctx.beginPath();
    ctx.roundRect(x, top, colW, heightOf(side), 22);
    ctx.fill();

    ctx.save();
    ctx.strokeStyle = `${side.accent}66`;
    ctx.lineWidth = 2;
    ctx.setLineDash([9, 7]);
    ctx.stroke();
    ctx.restore();

    const crestSize = tight ? 34 : 40;
    drawCrest(ctx, x + 18, top + 18, crestSize, side.accent, side.name);

    const nameX = x + 18 + crestSize + 14;
    const nameW = colW - (nameX - x) - 18;

    ctx.fillStyle = INK;
    ctx.font = `600 ${tight ? 28 : 32}px "Sofia Sans Extra Condensed", "Sofia Sans", sans-serif`;
    ctx.fillText(fit(ctx, side.name.toUpperCase(), nameW), nameX, top + 42);

    ctx.fillStyle = MUTED;
    ctx.font = `400 ${tight ? 19 : 21}px "Sofia Sans", sans-serif`;
    ctx.fillText(
      fit(ctx, fillWords(words.onPitch, { count: side.players.length }), nameW),
      nameX,
      top + 68,
    );

    side.players.forEach((player, seat) => {
      const rowTop = top + blockHead + seat * rowH;
      const image = photos.get(player.id) ?? null;
      const category = categoryOf(player.birthDate);
      const photoX = x + 18;
      const photoY = rowTop + (rowH - photo) / 2 - 4;

      ctx.save();
      circle(ctx, photoX, photoY, photo);
      ctx.clip();

      if (image) {
        ctx.drawImage(image, photoX, photoY, photo, photo);
      } else {
        ctx.fillStyle = "#22262a";
        ctx.fillRect(photoX, photoY, photo, photo);
        ctx.fillStyle = MUTED;
        ctx.font = `600 ${tight ? 15 : 18}px "Sofia Sans", sans-serif`;
        ctx.textAlign = "center";
        ctx.fillText(
          initialsOf(player.firstName, player.lastName),
          photoX + photo / 2,
          photoY + photo / 2 + (tight ? 5 : 6),
        );
        ctx.textAlign = "left";
      }

      ctx.restore();

      // The age category colour as a ring, the way the pitch tokens are outlined.
      ctx.strokeStyle = category.color;
      ctx.lineWidth = 2.5;
      circle(ctx, photoX, photoY, photo);
      ctx.stroke();

      /*
       * The gloves take their room before the name does: who is in goal is the
       * first thing anybody looks for on a lineup, and a name cut short is a
       * smaller loss than a keeper nobody can find.
       */
      const keeping = player.id === side.keeperId;
      const glove = keeping
        ? (side.borrowedKeeper ? words.inGoal : words.keeper).toUpperCase()
        : "";

      ctx.font = `600 ${tight ? 16 : 18}px "Sofia Sans", sans-serif`;
      const gloveW = glove ? ctx.measureText(glove).width : 0;

      const textX = photoX + photo + 14;
      const textW = colW - (textX - x) - 18 - (glove ? gloveW + 14 : 0);

      if (glove) {
        ctx.fillStyle = side.accent;
        ctx.fillText(glove, x + colW - 18 - gloveW, rowTop + rowH / 2 + 2);
      }

      ctx.fillStyle = INK;
      ctx.font = `500 ${tight ? 20 : 23}px "Sofia Sans", sans-serif`;
      ctx.fillText(
        fit(ctx, `${player.firstName} ${player.lastName}`, textW),
        textX,
        rowTop + rowH / 2 - (tight ? 1 : 2),
      );

      ctx.fillStyle = category.color;
      ctx.font = `500 ${tight ? 15 : 17}px "Sofia Sans", sans-serif`;
      ctx.fillText(
        fit(ctx, category.label.toUpperCase(), textW),
        textX,
        rowTop + rowH / 2 + (tight ? 17 : 19),
      );
    });
  });

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error("The card could not be drawn")),
      "image/jpeg",
      0.94,
    );
  });
}

/**
 * The same picture, in the one format a clipboard will take.
 *
 * Every card here is a JPEG for its size and `ClipboardItem` only takes PNG, so
 * anything offering "copy the image" comes through this on the way out.
 */
export async function asPng(jpeg: Blob) {
  const bitmap = await createImageBitmap(jpeg);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0);
  bitmap.close();

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("share.noImageCopy"))),
      "image/png",
    );
  });
}

/* ---------------------------- the night's money --------------------------- */

/** The words on the accounts card and in its message. */
export type AccountsWords = {
  title: string;
  pitchBet: string;
  pot: string;
  winners: string;
  noWinner: string;
  toCollect: string;
  toHand: string;
  collect: string;
  hand: string;
  square: string;
  breakdownWinner: string;
  breakdown: string;
  noShow: string;
  /** Con la apuesta por partido. */
  pitchPerGame: string;
  debt: string;
  noDebts: string;
  wonOf: string;
  lostOf: string;
  pitchOf: string;
};

const ACCOUNT_ROW = 92;
const ACCOUNT_PHOTO = 56;

/**
 * The night's accounts as a picture for the group: the pot and who won it,
 * then every player with what they owe or are owed, all settled together.
 *
 * One column, unlike the lineup: each row carries a name, the sum behind the
 * amount and the amount itself, and two of those side by side do not fit.
 */
export async function renderAccountsCard(
  match: Match,
  live: Pick<MatchLive, "games" | "goals">,
  words: AccountsWords,
  lang: "en" | "es" = "en",
): Promise<Blob> {
  const { money, prize, rental, ledger, toCollect } = nightAccounts(
    match,
    live,
  );
  const everybody = new Map(
    [...match.players, ...match.noShows].map((player) => [player.id, player]),
  );
  // Only who still owes: what the organizer hands out is between them and
  // the winners, and whoever has paid has nothing left to be told.
  const rows = owing(ledger).flatMap((row) => {
    const player = everybody.get(row.playerId);
    return player ? [{ row, player }] : [];
  });

  const headerH = 330;
  const height = headerH + rows.length * ACCOUNT_ROW + PAD;

  const canvas = document.createElement("canvas");
  canvas.width = W * SCALE;
  canvas.height = height * SCALE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("This browser cannot draw the card");
  ctx.scale(SCALE, SCALE);

  if (document.fonts?.ready) await document.fonts.ready;

  const [logo, photos] = await Promise.all([
    loadLogo(),
    Promise.all(rows.map(({ player }) => loadPhoto(player))),
  ]);

  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, height);

  /* -------------------------------- header ------------------------------- */

  let y = PAD;

  if (logo) {
    const logoW = 200;
    const logoH = (logo.height / logo.width) * logoW;
    ctx.drawImage(logo, PAD, y, logoW, logoH);
    y += logoH + 30;
  }

  ctx.fillStyle = INK;
  ctx.font = `600 46px "Sofia Sans Extra Condensed", "Sofia Sans", sans-serif`;
  ctx.fillText(
    fit(
      ctx,
      `${words.title} · ${formatLongDate(match.playedAt, lang)}`.toUpperCase(),
      W - PAD * 2,
    ),
    PAD,
    y + 34,
  );
  y += 70;

  ctx.fillStyle = MUTED;
  ctx.font = `400 25px "Sofia Sans", sans-serif`;
  ctx.fillText(
    fit(ctx, pitchBetLine(money, rental, words), W - PAD * 2),
    PAD,
    y + 20,
  );
  y += 44;

  // The pot, and who takes it; or, betting per game, who owes whom.
  ctx.font = `600 29px "Sofia Sans", sans-serif`;
  ctx.fillStyle = LIME;
  ctx.fillText(
    fit(ctx, moneyLine(money, prize, words), W - PAD * 2),
    PAD,
    y + 24,
  );
  y += 46;

  ctx.font = `500 25px "Sofia Sans", sans-serif`;
  ctx.fillStyle = OWING;
  ctx.fillText(
    fillWords(words.toCollect, { money: formatMoney(toCollect) }),
    PAD,
    y + 22,
  );

  /* -------------------------------- the rows ------------------------------ */

  const teamById = new Map(match.teams.map((team) => [team.id, team]));
  const amountW = 190;

  rows.forEach(({ row, player }, index) => {
    const top = headerH + index * ACCOUNT_ROW;
    const x = PAD;
    const width = W - PAD * 2;

    ctx.fillStyle = CARD;
    ctx.beginPath();
    ctx.roundRect(x, top, width, ACCOUNT_ROW - 12, 16);
    ctx.fill();

    const photoX = x + 14;
    const photoY = top + (ACCOUNT_ROW - 12 - ACCOUNT_PHOTO) / 2;
    const image = photos[index]?.image ?? null;

    ctx.save();
    circle(ctx, photoX, photoY, ACCOUNT_PHOTO);
    ctx.clip();
    if (image) {
      ctx.drawImage(image, photoX, photoY, ACCOUNT_PHOTO, ACCOUNT_PHOTO);
    } else {
      ctx.fillStyle = "#22262a";
      ctx.fillRect(photoX, photoY, ACCOUNT_PHOTO, ACCOUNT_PHOTO);
      ctx.fillStyle = MUTED;
      ctx.font = `600 22px "Sofia Sans", sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText(
        initialsOf(player.firstName, player.lastName),
        photoX + ACCOUNT_PHOTO / 2,
        photoY + ACCOUNT_PHOTO / 2 + 8,
      );
      ctx.textAlign = "left";
    }
    ctx.restore();

    // The side they played for, as a ring; grey for whoever did not come.
    ctx.strokeStyle = teamById.get(row.teamId)?.accent ?? "#71717a";
    ctx.lineWidth = 3;
    circle(ctx, photoX, photoY, ACCOUNT_PHOTO);
    ctx.stroke();

    const textX = photoX + ACCOUNT_PHOTO + 22;
    const textW = width - (textX - x) - amountW - 16;

    ctx.fillStyle = INK;
    ctx.font = `600 26px "Sofia Sans", sans-serif`;
    ctx.fillText(
      fit(ctx, `${player.firstName} ${player.lastName}`, textW),
      textX,
      top + 36,
    );

    ctx.fillStyle = MUTED;
    ctx.font = `400 20px "Sofia Sans", sans-serif`;
    const breakdown = breakdownOf(row, money, rental, words);
    ctx.fillText(fit(ctx, breakdown, textW), textX, top + 64);

    // The amount, on the right, in the colour of which way it goes.
    const right = x + width - 20;
    const owes = row.settle < -0.004;
    const owed = row.settle > 0.004;

    ctx.textAlign = "right";
    ctx.font = `500 16px "Sofia Sans", sans-serif`;
    ctx.fillStyle = owes ? OWING : owed ? PAID : MUTED;
    ctx.fillText(
      (owes ? words.collect : owed ? words.hand : words.square).toUpperCase(),
      right,
      top + 30,
    );

    if (owes || owed) {
      ctx.font = `600 32px "Sofia Sans Extra Condensed", "Sofia Sans", sans-serif`;
      ctx.fillText(formatMoney(Math.abs(row.settle)), right, top + 64);
    }
    ctx.textAlign = "left";
  });

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error("The card could not be drawn")),
      "image/jpeg",
      0.94,
    );
  });
}

/** The same accounts as a message, for a chat that wants text. */
export function accountsShareText(
  match: Match,
  live: Pick<MatchLive, "games" | "goals">,
  words: AccountsWords,
  lang: "en" | "es" = "en",
) {
  const { money, prize, rental, ledger, toCollect } = nightAccounts(
    match,
    live,
  );
  const everybody = new Map(
    [...match.players, ...match.noShows].map((player) => [player.id, player]),
  );

  const lines = [
    `*${words.title} · ${formatLongDate(match.playedAt, lang)}*`,
    pitchBetLine(money, rental, words),
    moneyLine(money, prize, words),
    fillWords(words.toCollect, { money: formatMoney(toCollect) }),
    "",
  ];

  for (const row of owing(ledger)) {
    const player = everybody.get(row.playerId);
    if (!player) continue;

    lines.push(
      `⏳ ${player.firstName} ${player.lastName}: ${formatMoney(-row.settle)}`,
    );
  }

  return lines.join("\n");
}

/** La cancha y la apuesta, cada una por cabeza. */
function pitchBetLine(money: NightMoney, rental: number, words: AccountsWords) {
  return fillWords(
    money.mode === "pot" ? words.pitchBet : words.pitchPerGame,
    { pitch: formatMoney(rental), bet: formatMoney(money.bet) },
  );
}

/** El pozo y quién lo ganó, o, apostando por partido, quién le debe a quién. */
function moneyLine(
  money: NightMoney,
  prize: ReturnType<typeof nightAccounts>["prize"],
  words: AccountsWords,
) {
  if (money.mode === "perGame") {
    const debts = money.games.debts.map((debt) =>
      fillWords(words.debt, {
        from: debt.from.name,
        to: debt.to.name,
        money: formatMoney(debt.amount),
      }),
    );
    return debts.length ? debts.join(" · ") : words.noDebts;
  }

  const winners = prize.rows.filter((row) =>
    prize.winnerIds.includes(row.team.id),
  );
  return `${fillWords(words.pot, { money: formatMoney(prize.pot) })} · ${
    winners.length
      ? fillWords(words.winners, {
          teams: winners.map((row) => row.team.name).join(", "),
          each: formatMoney(prize.perWinner),
        })
      : words.noWinner
  }`;
}

/** De dónde sale lo que alguien debe o cobra. */
function breakdownOf(
  row: LedgerRow,
  money: NightMoney,
  rental: number,
  words: AccountsWords,
) {
  if (row.noShow) {
    return fillWords(words.noShow, { money: formatMoney(row.penalty) });
  }

  if (money.mode === "pot") {
    return fillWords(row.prize > 0 ? words.breakdownWinner : words.breakdown, {
      prize: formatMoney(row.prize),
      pitch: formatMoney(rental),
      bet: formatMoney(money.bet),
    });
  }

  // Lo que ganó su equipo, menos la cancha y lo que perdió.
  const won = row.prize > 0;
  return [
    won ? `${fillWords(words.wonOf, { money: formatMoney(row.prize) })} − ` : "",
    fillWords(words.pitchOf, { money: formatMoney(rental) }),
    row.bet > 0
      ? ` ${won ? "−" : "+"} ${fillWords(words.lostOf, { money: formatMoney(row.bet) })}`
      : "",
  ].join("");
}

/** Whoever still has something to pay: a negative balance not yet ticked off. */
function owing<T extends { settle: number; paid: boolean }>(ledger: T[]) {
  return ledger.filter((row) => row.settle < -0.004 && !row.paid);
}
