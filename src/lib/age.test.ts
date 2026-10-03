import { describe, expect, it } from "vitest";

import { birthdaysAhead, nextBirthday } from "./age";
import { ageOn, categoryForAge } from "./constants";

describe("ageOn", () => {
  it("turns over on the birthday itself, not the day after", () => {
    expect(ageOn("1990-10-03", "2026-10-02")).toBe(35);
    expect(ageOn("1990-10-03", "2026-10-03")).toBe(36);
  });

  it("has no age for a missing or broken date", () => {
    expect(ageOn(null, "2026-10-03")).toBeNull();
    expect(ageOn("1990-13-01", "2026-10-03")).toBeNull();
  });
});

describe("categoryForAge", () => {
  it("files people the way a league does", () => {
    expect(categoryForAge(9).id).toBe("sub15");
    expect(categoryForAge(14).id).toBe("sub15");
    expect(categoryForAge(15).id).toBe("sub18");
    expect(categoryForAge(17).id).toBe("sub18");
    expect(categoryForAge(18).id).toBe("libre");
    expect(categoryForAge(39).id).toBe("libre");
    expect(categoryForAge(40).id).toBe("master");
    expect(categoryForAge(49).id).toBe("master");
    expect(categoryForAge(50).id).toBe("supermaster");
    expect(categoryForAge(70).id).toBe("supermaster");
    expect(categoryForAge(null).id).toBe("unknown");
  });
});

describe("nextBirthday", () => {
  it("counts today as zero days away", () => {
    expect(nextBirthday("1990-10-03", "2026-10-03")).toEqual({
      date: "2026-10-03",
      days: 0,
      turning: 36,
    });
  });

  it("rolls over to next year once it has passed", () => {
    expect(nextBirthday("1990-10-01", "2026-10-03")).toEqual({
      date: "2027-10-01",
      days: 363,
      turning: 37,
    });
  });

  it("crosses the new year", () => {
    expect(nextBirthday("2000-01-02", "2026-12-30")?.days).toBe(3);
  });

  it("gives a 29 February birthday the 28th in other years", () => {
    expect(nextBirthday("2000-02-29", "2027-02-01")?.date).toBe("2027-02-28");
    expect(nextBirthday("2000-02-29", "2028-02-01")?.date).toBe("2028-02-29");
  });
});

describe("birthdaysAhead", () => {
  const people = [
    { id: "a", birthDate: "1990-12-25" },
    { id: "b", birthDate: "1985-10-05" },
    { id: "c", birthDate: null },
    { id: "d", birthDate: "2001-10-09" },
  ];

  it("sorts soonest first and leaves out who has no date", () => {
    expect(
      birthdaysAhead(people, "2026-10-03").map((one) => one.person.id),
    ).toEqual(["b", "d", "a"]);
  });

  it("keeps only the coming week when asked", () => {
    expect(
      birthdaysAhead(people, "2026-10-03", 7).map((one) => one.person.id),
    ).toEqual(["b", "d"]);
  });
});
