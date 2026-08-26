import type { Orientation } from "./formation";
import { clamp } from "./utils";

/**
 * Pitch geometry resolved in real container pixels.
 *
 * The SVG uses `viewBox="0 0 width height"` with the same units as the
 * container, so 1 unit = 1 px and nothing is distorted: the center circle stays
 * a perfect circle and only changes size with the device.
 *
 * Everything is computed in (l, w) space -- "length" from goal to goal and
 * "width" from touchline to touchline -- and then projected to (x, y) based on
 * orientation. The same formula therefore serves landscape screens (boxes left
 * and right) and portrait ones (boxes top and bottom).
 */
export type PitchGeometry = {
  orientation: Orientation;
  width: number;
  height: number;
  strokeWidth: number;
  /** Playing rectangle (touchlines). */
  field: { x: number; y: number; width: number; height: number };
  halfway: { x1: number; y1: number; x2: number; y2: number };
  centerCircle: { cx: number; cy: number; r: number };
  spots: Array<{ cx: number; cy: number }>;
  boxes: Array<{ x: number; y: number; width: number; height: number }>;
  goals: Array<{ x: number; y: number; width: number; height: number }>;
  /** Penalty arcs and corner arcs, already projected. */
  arcs: string[];
  corners: string[];
  /** Width of each zebra grass stripe, in px. */
  stripeSize: number;
};

/** Real FIFA pitch proportions (105 x 68 m), normalized. */
const RATIO = {
  penaltyDepth: 16.5 / 105,
  penaltyWidth: 40.32 / 68,
  goalAreaDepth: 5.5 / 105,
  goalAreaWidth: 18.32 / 68,
  penaltySpot: 11 / 105,
  circleRadius: 9.15 / 68,
  goalWidth: 7.32 / 68,
} as const;

const STRIPES = 10;
const ARC_SEGMENTS = 22;

export function buildPitchGeometry(
  containerWidth: number,
  containerHeight: number,
): PitchGeometry {
  const orientation: Orientation =
    containerWidth >= containerHeight ? "landscape" : "portrait";

  const landscape = orientation === "landscape";

  const margin = clamp(Math.min(containerWidth, containerHeight) * 0.03, 8, 34);

  const originX = margin;
  const originY = margin;
  const fieldW = Math.max(containerWidth - margin * 2, 1);
  const fieldH = Math.max(containerHeight - margin * 2, 1);

  const L = landscape ? fieldW : fieldH;
  const W = landscape ? fieldH : fieldW;

  /** (l, w) -> (x, y) */
  const px = (l: number, w: number) =>
    landscape
      ? { x: originX + l, y: originY + w }
      : { x: originX + w, y: originY + l };

  const cw = W / 2;

  // Boxes are sized off the length but capped against the width, so very
  // elongated screens do not end up with boxes swallowing the pitch.
  const penaltyDepth = Math.min(L * RATIO.penaltyDepth, W * 0.26);
  const penaltyWidth = Math.min(W * RATIO.penaltyWidth, L * 0.8);
  const goalAreaDepth = Math.min(L * RATIO.goalAreaDepth, penaltyDepth * 0.42);
  const goalAreaWidth = Math.min(W * RATIO.goalAreaWidth, penaltyWidth * 0.5);
  const penaltySpot = Math.min(L * RATIO.penaltySpot, penaltyDepth * 0.72);

  // One radius for the center circle and the arcs: 1:1 guaranteed.
  const circleR = clamp(
    Math.min(W * RATIO.circleRadius, L * 0.11),
    18,
    Math.min(W, L) * 0.22,
  );

  const goalWidth = Math.min(W * RATIO.goalWidth, penaltyWidth * 0.42);
  const goalDepth = clamp(Math.min(L, W) * 0.02, 5, 16);
  const cornerR = clamp(Math.min(L, W) * 0.022, 7, 20);

  /** Rectangle defined in (l, w) and projected. */
  const rect = (l: number, w: number, dl: number, dw: number) => {
    const a = px(l, w);
    return {
      x: a.x,
      y: a.y,
      width: landscape ? dl : dw,
      height: landscape ? dw : dl,
    };
  };

  /** Circular polyline sampled in (l, w): avoids SVG arc-flag ambiguity. */
  const arc = (
    cl: number,
    cwCenter: number,
    r: number,
    from: number,
    to: number,
  ) => {
    const points: string[] = [];
    for (let i = 0; i <= ARC_SEGMENTS; i++) {
      const t = from + ((to - from) * i) / ARC_SEGMENTS;
      const p = px(cl + Math.cos(t) * r, cwCenter + Math.sin(t) * r);
      points.push(`${i === 0 ? "M" : "L"}${p.x.toFixed(2)} ${p.y.toFixed(2)}`);
    }
    return points.join(" ");
  };

  const center = px(L / 2, cw);

  const halfwayA = px(L / 2, 0);
  const halfwayB = px(L / 2, W);

  const boxes = [
    rect(0, cw - penaltyWidth / 2, penaltyDepth, penaltyWidth),
    rect(L - penaltyDepth, cw - penaltyWidth / 2, penaltyDepth, penaltyWidth),
    rect(0, cw - goalAreaWidth / 2, goalAreaDepth, goalAreaWidth),
    rect(L - goalAreaDepth, cw - goalAreaWidth / 2, goalAreaDepth, goalAreaWidth),
  ];

  const goals = [
    rect(-goalDepth, cw - goalWidth / 2, goalDepth, goalWidth),
    rect(L, cw - goalWidth / 2, goalDepth, goalWidth),
  ];

  // Penalty arc: only the part that sticks out of the penalty box.
  const arcs: string[] = [];
  const cosLimit = (penaltyDepth - penaltySpot) / circleR;
  if (Math.abs(cosLimit) < 1) {
    const theta = Math.acos(cosLimit);
    arcs.push(arc(penaltySpot, cw, circleR, -theta, theta));
    arcs.push(arc(L - penaltySpot, cw, circleR, Math.PI - theta, Math.PI + theta));
  }

  const HALF_PI = Math.PI / 2;
  const corners = [
    arc(0, 0, cornerR, 0, HALF_PI),
    arc(0, W, cornerR, -HALF_PI, 0),
    arc(L, 0, cornerR, HALF_PI, Math.PI),
    arc(L, W, cornerR, Math.PI, Math.PI + HALF_PI),
  ];

  const spotPositions = [
    px(penaltySpot, cw),
    px(L - penaltySpot, cw),
    { x: center.x, y: center.y },
  ];

  return {
    orientation,
    width: containerWidth,
    height: containerHeight,
    strokeWidth: clamp(Math.min(containerWidth, containerHeight) * 0.0028, 1, 3),
    field: { x: originX, y: originY, width: fieldW, height: fieldH },
    halfway: { x1: halfwayA.x, y1: halfwayA.y, x2: halfwayB.x, y2: halfwayB.y },
    centerCircle: { cx: center.x, cy: center.y, r: circleR },
    spots: spotPositions.map((p) => ({ cx: p.x, cy: p.y })),
    boxes,
    goals,
    arcs,
    corners,
    stripeSize: L / STRIPES,
  };
}
