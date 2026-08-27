"use client";

import { getArea } from "./constants";
import { formatLongDate, formatTimeRange } from "./date";
import { formatMoney, perPlayer } from "./money";
import { thumbUrl } from "./media-url";
import { placeMapsUrl } from "./maps";
import { initialsOf } from "./utils";
import type { Match, Player } from "@/types";

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
 * Draws the whole card and hands back a file ready to download or share.
 *
 * JPEG rather than PNG: the same picture is a few hundred kilobytes instead of
 * several megabytes, and every chat app recompresses it anyway.
 */
export async function renderMatchCard(match: Match): Promise<Blob> {
  const players = match.players;
  const paid = new Set(match.paidPlayerIds);
  const columns = Math.min(COLUMNS, Math.max(players.length, 1));
  const rows = Math.ceil(players.length / columns);

  const headerH = 348;
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
  ctx.fillText(formatLongDate(match.playedAt).toUpperCase(), PAD, y + 34);
  y += 74;

  ctx.fillStyle = MUTED;
  ctx.font = `400 26px "Sofia Sans", sans-serif`;

  const facts = [
    formatTimeRange(match.playedAt, match.endsAt),
    match.place?.name,
    `${players.length} ${players.length === 1 ? "player" : "players"}`,
  ].filter(Boolean) as string[];

  ctx.fillText(fit(ctx, facts.join("   ·   "), W - PAD * 2), PAD, y + 20);
  y += 46;

  const share = perPlayer(match.place?.price, players.length);
  if (share !== null) {
    ctx.fillStyle = LIME;
    ctx.font = `600 30px "Sofia Sans", sans-serif`;
    ctx.fillText(`${formatMoney(share)} each`, PAD, y + 24);
  }
  y += 44;

  // Where the rental stands, in one line: the reason the list is shared at all.
  const owing = players.length - paid.size;
  ctx.font = `500 25px "Sofia Sans", sans-serif`;

  ctx.fillStyle = PAID;
  const paidLabel = `${paid.size} paid`;
  ctx.fillText(paidLabel, PAD, y + 22);

  if (owing > 0) {
    const at = PAD + ctx.measureText(paidLabel).width;
    ctx.fillStyle = MUTED;
    ctx.fillText("   ·   ", at, y + 22);
    ctx.fillStyle = OWING;
    ctx.fillText(
      `${owing} pending${share === null ? "" : ` (${formatMoney(share * owing)})`}`,
      at + ctx.measureText("   ·   ").width,
      y + 22,
    );
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
    const area = getArea(player.area);

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

    // The area colour as a ring, the way the pitch tokens are outlined.
    ctx.strokeStyle = area.color;
    ctx.lineWidth = 3;
    circle(ctx, photoX, photoY, PHOTO);
    ctx.stroke();

    const textX = photoX + PHOTO + GAP;
    // Room on the right for the mark that says whether they have paid.
    const textW = colW - 16 - (textX - x) - 66;

    drawPaidMark(ctx, x + colW - 16 - 44, top + (ROW_H - 14) / 2, paid.has(player.id));

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

    ctx.fillStyle = area.color;
    ctx.font = `500 22px "Sofia Sans", sans-serif`;
    ctx.fillText(fit(ctx, area.label.toUpperCase(), textW), textX, top + 70);
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
export function matchShareText(match: Match) {
  const share = perPlayer(match.place?.price, match.players.length);

  const lines = [
    `*${formatLongDate(match.playedAt)}*`,
    `${formatTimeRange(match.playedAt, match.endsAt)}${match.place ? ` · ${match.place.name}` : ""}`,
  ];

  if (share !== null) lines.push(`${formatMoney(share)} each`);
  const maps = placeMapsUrl(match.place);
  if (maps) lines.push(maps);

  const paid = new Set(match.paidPlayerIds);
  const owing = match.players.length - paid.size;

  lines.push("");
  lines.push(`*${match.players.length} on the pitch*`);
  lines.push(
    owing === 0
      ? "Everybody has paid"
      : `${paid.size} paid, ${owing} pending${share === null ? "" : ` (${formatMoney(share * owing)})`}`,
  );
  lines.push("");

  match.players.forEach((player, index) => {
    const crown = player.id === match.organizerId ? " (organizer)" : "";
    const mark = paid.has(player.id) ? "✅" : "⏳";
    lines.push(
      `${mark} ${index + 1}. ${player.firstName} ${player.lastName}${crown}`,
    );
  });

  return lines.join("\n");
}
