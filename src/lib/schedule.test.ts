import { describe, expect, it } from "vitest";

import { planFrom, planRest, recommendedGamePlan } from "./schedule";

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

  it("prefers full rounds with four sides", () => {
    // Ninety minutes: two full rounds of seven beat ten games of nine.
    expect(recommendedGamePlan(1.5 * HOUR, 4)).toEqual({ minutes: 7, games: 12 });
    // Forty-five: six of seven, everybody meets everybody.
    expect(recommendedGamePlan(45 * 60_000, 4)).toEqual({ minutes: 7, games: 6 });
  });

  it("falls back to an even count when a full round would be too short", () => {
    // Forty minutes: six games of six is not a game; four of ten still evens.
    expect(recommendedGamePlan(40 * 60_000, 4)).toEqual({ minutes: 10, games: 4 });
  });

  it("keeps the number of games a multiple of three with three sides", () => {
    // Ninety minutes: nine games of ten is three full rounds.
    expect(recommendedGamePlan(1.5 * HOUR, 3)).toEqual({ minutes: 10, games: 9 });
  });

  it("leaves two sides on games of about ten", () => {
    expect(recommendedGamePlan(HOUR, 2).minutes).toBe(10);
  });
});

describe("planFrom", () => {
  const match = { playedAt: 0, endsAt: HOUR };

  it("shortens the games for a night that starts late", () => {
    // Ten minutes late: fifty left for the same six games.
    expect(planFrom(match, 4, 10 * 60_000)).toEqual({ minutes: 8, games: 6 });
    expect(planFrom(match, 3, 10 * 60_000)).toEqual({ minutes: 8, games: 6 });
  });

  it("counts from the planned start when the draw is early", () => {
    expect(planFrom(match, 4, -10 * 60_000)).toEqual({ minutes: 10, games: 6 });
  });
});

describe("planRest", () => {
  it("fits the rest of a full round into an extra half hour", () => {
    // An hour booked, two games of ten played, half an hour added: seventy
    // minutes left, and two full rounds still fit -- ten games of seven.
    expect(planRest(2, 70 * 60_000, 4)).toEqual({ minutes: 7, games: 10, total: 12 });
    // The round done and half an hour added: six more games of five is too
    // short for a full second round, so four of seven keep the count even.
    expect(planRest(6, 30 * 60_000, 4)).toEqual({ minutes: 7, games: 4, total: 10 });
  });

  it("is the whole plan when nothing has been played", () => {
    expect(planRest(0, 50 * 60_000, 4)).toEqual({ minutes: 8, games: 6, total: 6 });
  });
});
