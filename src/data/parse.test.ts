import { describe, expect, it } from "vitest";
import { createDefaultFamilyData } from "./defaults";
import { parseFamilyData } from "./parse";

const valid = createDefaultFamilyData("fam-1", ["kid-1", "kid-2"]);

describe("parseFamilyData", () => {
  it("reads back what we saved", () => {
    const roundTrip: unknown = JSON.parse(JSON.stringify(valid));
    expect(parseFamilyData(roundTrip)).toEqual(valid);
  });

  it("refuses rubbish", () => {
    expect(parseFamilyData(null)).toBeNull();
    expect(parseFamilyData("hello")).toBeNull();
    expect(parseFamilyData([])).toBeNull();
    expect(parseFamilyData({})).toBeNull();
  });

  it("refuses data from a future version", () => {
    expect(parseFamilyData({ ...valid, version: 2 })).toBeNull();
  });

  it("drops a broken kid but keeps the good one", () => {
    const mixed = {
      ...valid,
      kids: [valid.kids[0], { id: "x", familyId: "fam-1", name: "Bad", level: "grown-up" }],
    };
    const parsed = parseFamilyData(mixed);
    expect(parsed?.kids).toHaveLength(1);
    expect(parsed?.kids[0]?.name).toBe("Little one");
  });

  it("drops a broken score row", () => {
    const withScores = {
      ...valid,
      sessions: [
        {
          id: "s1",
          kidId: "kid-1",
          gameId: "color-clash",
          level: "junior",
          score: 12,
          detail: "1 mistake",
          playedAt: "2026-11-02T10:00:00.000Z",
          durationMs: 45_000,
        },
        { id: "s2", kidId: "kid-1", gameId: "color-clash", level: "junior", score: "lots" },
      ],
    };
    const parsed = parseFamilyData(withScores);
    expect(parsed?.sessions).toHaveLength(1);
    expect(parsed?.sessions[0]?.score).toBe(12);
  });

  it("fills in missing optional fields", () => {
    const kidWithoutLimit = {
      ...valid,
      kids: [{ ...valid.kids[0], dailyLimitMinutes: "oops" }],
    };
    expect(parseFamilyData(kidWithoutLimit)?.kids[0]?.dailyLimitMinutes).toBeNull();
  });
});
