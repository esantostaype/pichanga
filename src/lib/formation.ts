import { clamp } from "./utils";

export type Orientation = "landscape" | "portrait";

export type FormationSlot = {
  /** Token center in px, relative to the pitch container. */
  x: number;
  y: number;
  /** Row (goal-to-goal axis) and lane (touchline-to-touchline axis). */
  row: number;
  lane: number;
};

export type Formation = {
  orientation: Orientation;
  rows: number;
  lanes: number;
  slots: FormationSlot[];
  /** Avatar diameter, in px. */
  tokenSize: number;
  /** Name plate width, in px. */
  plateWidth: number;
};

/**
 * The grid grows with the squad: there is no player cap, so the only thing
 * bounding rows and lanes is how many fit on screen.
 */

/** Inner padding: tokens never sit on the touchlines. */
const PAD_LENGTH = 0.085;
const PAD_WIDTH = 0.075;

/** Floor low enough that very large squads still shrink instead of colliding. */
const MIN_TOKEN = 16;
const MAX_TOKEN = 84;

/** Total token height is roughly avatar + name plate. */
export const TOKEN_HEIGHT_FACTOR = 1.78;

/**
 * Spreads `count` players across `rows` rows, giving the leftovers to the most
 * central rows so the lineup grows outwards from the middle.
 *
 * With `centreSlot`, the middle row is nudged to an odd size. `spread()` only
 * produces the exact 0.5 position for an odd count, so this is what makes a
 * true centre-of-the-pitch slot exist for the organizer.
 */
function distribute(count: number, rows: number, centreSlot = false): number[] {
  const base = Math.floor(count / rows);
  let remainder = count % rows;

  const perRow = new Array<number>(rows).fill(base);
  const mid = (rows - 1) / 2;

  const byCentrality = Array.from({ length: rows }, (_, i) => i).sort(
    (a, b) => Math.abs(a - mid) - Math.abs(b - mid) || a - b,
  );

  for (const row of byCentrality) {
    if (remainder === 0) break;
    perRow[row] += 1;
    remainder -= 1;
  }

  if (centreSlot && rows % 2 === 1) {
    const middle = (rows - 1) / 2;

    if (perRow[middle] % 2 === 0) {
      // Borrow a player from the fullest other row, or lend one to it, so the
      // middle row ends up odd and its centre lane lands dead centre.
      const donor = byCentrality
        .filter((row) => row !== middle && perRow[row] > 0)
        .sort((a, b) => perRow[b] - perRow[a])[0];

      // Moving a player keeps the total intact. When no row can lend one there
      // is simply no exact centre, which beats losing a player off the pitch.
      if (donor !== undefined) {
        perRow[donor] -= 1;
        perRow[middle] += 1;
      }
    }
  }

  return perRow;
}

/**
 * Grid that makes the best use of the space: aims for cells as square as
 * possible given the container aspect ratio.
 */
function gridFor(
  count: number,
  lengthPx: number,
  widthPx: number,
  centreSlot = false,
) {
  const ratio = lengthPx / widthPx;
  // Unbounded on purpose: `rows * lanes >= count` always holds, so no player
  // is ever left without a slot no matter how big the squad gets.
  const rows = Math.max(1, Math.round(Math.sqrt(count * ratio)));
  const lanes = Math.max(1, Math.ceil(count / rows));
  let finalRows = Math.max(1, Math.ceil(count / lanes));

  // An even row count puts no row on the halfway line, so there can be no
  // centre slot. Dropping a row is preferred over adding one, since it keeps
  // the rows further apart; it only works while every player still fits.
  if (centreSlot && finalRows % 2 === 0) {
    finalRows += (finalRows - 1) * lanes >= count ? -1 : 1;
  }

  // A single row with an even squad straddles the halfway line, so nobody is
  // dead centre. Three rows leave the middle one odd, which fixes it.
  if (centreSlot && finalRows === 1 && count > 1 && count % 2 === 0) finalRows = 3;

  return { rows: finalRows, lanes: Math.max(1, Math.ceil(count / finalRows)) };
}

/** Evenly spaced, centered positions inside [pad, 1 - pad]. */
function spread(total: number, pad: number): number[] {
  const usable = 1 - pad * 2;
  return Array.from(
    { length: total },
    (_, i) => pad + (usable * (i + 0.5)) / total,
  );
}

const EMPTY: Formation = {
  orientation: "landscape",
  rows: 0,
  lanes: 0,
  slots: [],
  tokenSize: MIN_TOKEN,
  plateWidth: MIN_TOKEN * 2,
};

/**
 * Builds the whole lineup.
 *
 * Positions are sorted by distance to the center of the pitch: the first
 * player signed up takes the center circle and every new one lands further
 * out, always keeping mirror symmetry about the long axis.
 */
export function buildFormation(
  count: number,
  containerWidth: number,
  containerHeight: number,
  /**
   * Vertical space reserved at the top *and* the bottom, in px, so the HUD
   * never covers a token. Applied to both edges to preserve symmetry.
   */
  insetY = 0,
  /**
   * Reserves the exact centre of the pitch for the first player, which is
   * where the organizer goes.
   */
  centreSlot = false,
): Formation {
  const orientation: Orientation =
    containerWidth >= containerHeight ? "landscape" : "portrait";

  if (count <= 0 || containerWidth <= 0 || containerHeight <= 0) {
    return { ...EMPTY, orientation };
  }

  const landscape = orientation === "landscape";

  // Orientation stays tied to the real container, but players are laid out
  // inside the safe band so a tall HUD cannot flip the whole formation.
  // The cap keeps a big HUD from squeezing the lineup into a thin strip: the
  // row padding below already adds clearance on top of this inset.
  const safeInset = clamp(insetY, 0, containerHeight * 0.12);
  const usableHeight = containerHeight - safeInset * 2;

  // "Length" axis runs goal to goal, "width" axis touchline to touchline.
  const lengthPx = landscape ? containerWidth : usableHeight;
  const widthPx = landscape ? usableHeight : containerWidth;

  const { rows, lanes } = gridFor(count, lengthPx, widthPx, centreSlot);
  const perRow = distribute(count, rows, centreSlot);
  const rowPositions = spread(rows, PAD_LENGTH);

  const cellLength = (lengthPx * (1 - PAD_LENGTH * 2)) / rows;
  const cellWidth = (widthPx * (1 - PAD_WIDTH * 2)) / Math.max(...perRow, 1);

  // Rows stack along the length axis, so the real gap between neighbours
  // depends on orientation. That is what drives the token size.
  const horizontalGap = landscape ? cellLength : cellWidth;
  const verticalGap = landscape ? cellWidth : cellLength;

  // Floored, not rounded: rounding up makes the plate taller than the gap it
  // was measured from, which shows up as a one-pixel overlap between rows.
  const tokenSize = Math.floor(
    clamp(
      Math.min(verticalGap / TOKEN_HEIGHT_FACTOR, horizontalGap * 0.7),
      MIN_TOKEN,
      MAX_TOKEN,
    ),
  );

  const plateWidth = Math.round(
    Math.max(Math.min(horizontalGap * 0.94, tokenSize * 2.6), tokenSize * 1.15),
  );

  const slots: FormationSlot[] = [];

  for (let row = 0; row < rows; row++) {
    const inRow = perRow[row];
    if (inRow === 0) continue;

    const lanePositions = spread(inRow, PAD_WIDTH);

    for (let lane = 0; lane < inRow; lane++) {
      const l = rowPositions[row] * lengthPx;
      const w = lanePositions[lane] * widthPx;

      slots.push({
        x: landscape ? l : w,
        y: safeInset + (landscape ? w : l),
        row,
        lane,
      });
    }
  }

  const cx = containerWidth / 2;
  const cy = containerHeight / 2;

  slots.sort((a, b) => {
    const da = (a.x - cx) ** 2 + (a.y - cy) ** 2;
    const db = (b.x - cx) ** 2 + (b.y - cy) ** 2;
    if (Math.abs(da - db) > 0.5) return da - db;
    // Tie between mirrored positions: keep a stable, predictable order.
    return a.y - b.y || a.x - b.x;
  });

  return { orientation, rows, lanes, slots, tokenSize, plateWidth };
}

export type TeamBand = {
  /** Origin of the band inside the container, in px. */
  x: number;
  y: number;
  width: number;
  height: number;
  /** Slots already offset into container space. */
  slots: FormationSlot[];
};

export type TeamFormation = {
  orientation: Orientation;
  bands: TeamBand[];
  tokenSize: number;
  plateWidth: number;
};

/**
 * One formation per team, side by side.
 *
 * The pitch is cut into bands -- across the length when it is wide, down it
 * when it is tall -- and each team is laid out inside its own band by the same
 * code that lays out a whole squad. Splitting along the long axis is what makes
 * it read as teams facing each other rather than as one lineup with gaps in it.
 *
 * Token size is the smallest of the bands rather than each band's own: teams
 * are being compared to each other, and a side whose players are drawn bigger
 * than the next one's looks like it means something.
 */
export function buildTeamFormation(
  counts: number[],
  containerWidth: number,
  containerHeight: number,
  insetY = 0,
  /** Room kept at the top of every band for its crest and name. */
  headerPx = 0,
): TeamFormation {
  const orientation: Orientation =
    containerWidth >= containerHeight ? "landscape" : "portrait";

  if (
    counts.length === 0 ||
    containerWidth <= 0 ||
    containerHeight <= 0 ||
    counts.every((count) => count <= 0)
  ) {
    return { orientation, bands: [], tokenSize: MIN_TOKEN, plateWidth: 0 };
  }

  const landscape = orientation === "landscape";
  const bandWidth = landscape ? containerWidth / counts.length : containerWidth;
  const bandHeight = landscape
    ? containerHeight
    : containerHeight / counts.length;

  const bands = counts.map((count, index) => {
    const x = landscape ? index * bandWidth : 0;
    const y = landscape ? 0 : index * bandHeight;

    /*
     * Side by side, every band shares the same screen edges, so they all keep
     * the same clearance. Stacked, only the top band is under the HUD -- the
     * ones below it have a band above them instead.
     */
    const bandInset =
      (landscape ? insetY : index === 0 ? insetY : 0) + headerPx;

    const inner = buildFormation(count, bandWidth, bandHeight, bandInset);

    return {
      x,
      y,
      width: bandWidth,
      height: bandHeight,
      slots: inner.slots.map((slot) => ({
        ...slot,
        x: slot.x + x,
        y: slot.y + y,
      })),
      tokenSize: inner.tokenSize,
      plateWidth: inner.plateWidth,
    };
  });

  const sized = bands.filter((band) => band.slots.length > 0);

  return {
    orientation,
    bands: bands.map(({ x, y, width, height, slots }) => ({
      x,
      y,
      width,
      height,
      slots,
    })),
    tokenSize: sized.length
      ? Math.min(...sized.map((band) => band.tokenSize))
      : MIN_TOKEN,
    plateWidth: sized.length
      ? Math.min(...sized.map((band) => band.plateWidth))
      : 0,
  };
}
