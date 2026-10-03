import { describe, expect, it } from "vitest";

import { recommendedGamePlan } from "./schedule";

const HOUR = 60 * 60_000;

describe("recommendedGamePlan", () => {
  it("cuts an hour into six games of ten for three or four sides", () => {
    expect(recommendedGamePlan(HOUR, 4)).toEqual({ minutes: 10, games: 6 });
    expect(recommendedGamePlan(HOUR, 3)).toEqual({ minutes: 10, games: 6 });
  });

  it("cuts two hours into twelve games of ten", () => {
    expect(recommendedGamePlan(2 * HOUR, 4)).toEqual({ minutes: 10, games: 12 });
    expect(recommendedGamePlan(2 * HOUR, 3)).toEqual({ minutes: 10, games: 12 });
  });

  it("keeps the number of games even with four sides", () => {
    // Ninety minutes: nine games of ten would leave two sides a game up.
    expect(recommendedGamePlan(1.5 * HOUR, 4)).toEqual({ minutes: 9, games: 10 });
  });

  it("keeps the number of games a multiple of three with three sides", () => {
    // Ninety minutes: nine games of ten is three full rounds.
    expect(recommendedGamePlan(1.5 * HOUR, 3)).toEqual({ minutes: 10, games: 9 });
  });

  it("leaves two sides on games of about ten", () => {
    expect(recommendedGamePlan(HOUR, 2).minutes).toBe(10);
  });
});
