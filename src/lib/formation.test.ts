import { describe, expect, it } from "vitest";

import { buildTeamFormation } from "./formation";

const WIDTH = 1280;
const HEIGHT = 720;

describe("buildTeamFormation", () => {
  it("gives every team a slot for every player", () => {
    const formation = buildTeamFormation([7, 7, 6], WIDTH, HEIGHT, 96, 58);

    expect(formation.bands.map((band) => band.slots.length)).toEqual([7, 7, 6]);
  });

  it("cuts the pitch across its length when it is wide", () => {
    const formation = buildTeamFormation([5, 5], WIDTH, HEIGHT);

    expect(formation.orientation).toBe("landscape");
    expect(formation.bands.map((band) => band.x)).toEqual([0, WIDTH / 2]);
    expect(formation.bands.every((band) => band.y === 0)).toBe(true);
  });

  it("stacks the bands when the pitch is tall", () => {
    const formation = buildTeamFormation([5, 5], 720, 1280);

    expect(formation.orientation).toBe("portrait");
    expect(formation.bands.map((band) => band.y)).toEqual([0, 640]);
  });

  it("keeps every token inside its own band", () => {
    const formation = buildTeamFormation([7, 7, 6], WIDTH, HEIGHT, 96, 58);

    formation.bands.forEach((band) => {
      band.slots.forEach((slot) => {
        expect(slot.x).toBeGreaterThanOrEqual(band.x);
        expect(slot.x).toBeLessThanOrEqual(band.x + band.width);
      });
    });
  });

  it("draws every side at the same size", () => {
    // Two bands, one with twice the players: the tokens still match, because
    // a side drawn larger than the one beside it looks like it means something.
    const formation = buildTeamFormation([4, 12], WIDTH, HEIGHT);
    const solo = buildTeamFormation([12], WIDTH / 2, HEIGHT);

    expect(formation.tokenSize).toBe(solo.tokenSize);
  });

  it("has nothing to lay out for an empty draw", () => {
    expect(buildTeamFormation([], WIDTH, HEIGHT).bands).toHaveLength(0);
    expect(buildTeamFormation([0, 0], WIDTH, HEIGHT).bands).toHaveLength(0);
  });
});
