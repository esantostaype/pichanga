"use client";

import { useMemo } from "react";

import { buildPitchGeometry } from "@/lib/pitch-geometry";

type PitchSurfaceProps = {
  width: number;
  height: number;
};

/**
 * Grass and markings. The SVG uses a viewBox in real pixels, so nothing is
 * distorted: the boxes stretch with the screen while the center circle and the
 * arcs stay perfect circles.
 */
export function PitchSurface({ width, height }: PitchSurfaceProps) {
  const geometry = useMemo(
    () => buildPitchGeometry(width, height),
    [width, height],
  );

  if (width <= 0 || height <= 0) return null;

  const { orientation, stripeSize } = geometry;
  const stripeAxis = orientation === "landscape" ? "to right" : "to bottom";

  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Zebra grass */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          backgroundImage: `repeating-linear-gradient(${stripeAxis},
            var(--grass-a) 0px,
            var(--grass-a) ${stripeSize}px,
            var(--grass-b) ${stripeSize}px,
            var(--grass-b) ${stripeSize * 2}px)`,
        }}
      />

      {/* Grain and vignette */}
      <div
        aria-hidden
        className="pitch-grain absolute inset-0 opacity-[0.07] mix-blend-overlay"
      />
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 90% at 50% 45%, transparent 25%, rgba(0,0,0,0.55) 100%)",
        }}
      />

      <svg
        className="absolute inset-0 h-full w-full"
        viewBox={`0 0 ${width} ${height}`}
        width={width}
        height={height}
        aria-hidden
      >
        {/*
         * Every marking lives in one group so the opacity is composited once.
         * Drawing them individually with an alpha colour would make crossings
         * (halfway line on the touchline, boxes on the goal line, corner arcs)
         * render brighter than the rest.
         */}
        <g
          fill="none"
          stroke="var(--pitch-line)"
          strokeWidth={geometry.strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ opacity: "var(--pitch-line-opacity)" }}
        >
          {/* Goals, drawn behind the goal line */}
          {geometry.goals.map((goal, index) => (
            <rect
              key={`goal-${index}`}
              {...goal}
              fill="var(--pitch-line)"
              fillOpacity={0.12}
            />
          ))}

          <rect {...geometry.field} rx={2} />

          <line {...geometry.halfway} />

          <circle {...geometry.centerCircle} />

          {geometry.boxes.map((box, index) => (
            <rect key={`box-${index}`} {...box} />
          ))}

          {geometry.arcs.map((d, index) => (
            <path key={`arc-${index}`} d={d} />
          ))}

          {geometry.corners.map((d, index) => (
            <path key={`corner-${index}`} d={d} />
          ))}

          {geometry.spots.map((spot, index) => (
            <circle
              key={`spot-${index}`}
              {...spot}
              r={geometry.strokeWidth * 1.6}
              fill="var(--pitch-line)"
              stroke="none"
            />
          ))}
        </g>
      </svg>
    </div>
  );
}
