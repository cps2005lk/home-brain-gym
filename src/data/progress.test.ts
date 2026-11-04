import { describe, expect, it } from "vitest";
import {
  dailyProgress,
  dayKey,
  gameSummary,
  lastDays,
  recentPlays,
  weeklyProgress,
  weekStartKey,
} from "./progress";
import type { GameSession } from "./types";

const play = (
  id: string,
  score: number,
  playedAt: string,
  gameId = "color-clash",
): GameSession => ({
  id,
  kidId: "kid-1",
  gameId,
  level: "junior",
  score,
  detail: "",
  playedAt,
  durationMs: 45_000,
});

// Sri Lanka is UTC+5:30, so 19:00 UTC is already the next morning there.
const sessions: readonly GameSession[] = [
  play("a", 9, "2026-11-02T13:00:00.000Z"), // Mon 2 Nov, 18:30 local
  play("b", 12, "2026-11-02T14:30:00.000Z"), // same day, better
  play("c", 7, "2026-11-03T19:00:00.000Z"), // 00:30 local -> Wed 4 Nov
  play("d", 30, "2026-11-04T05:00:00.000Z", "arrow-rush"), // another game
  { ...play("e", 5, "2026-11-04T06:00:00.000Z"), kidId: "kid-2" }, // another kid
];

const now = { nowIso: "2026-11-04T12:00:00.000Z" };

describe("days in the family's time zone", () => {
  it("uses Sri Lanka time, not the device's", () => {
    // 19:00 UTC is 00:30 the next day in Colombo
    expect(dayKey("2026-11-03T19:00:00.000Z")).toBe("2026-11-04");
    expect(dayKey("2026-11-03T18:00:00.000Z")).toBe("2026-11-03");
  });

  it("can be told another time zone", () => {
    expect(dayKey("2026-11-03T19:00:00.000Z", "UTC")).toBe("2026-11-03");
  });

  it("lists the last days, oldest first", () => {
    expect(lastDays(4, now.nowIso)).toEqual([
      "2026-11-01",
      "2026-11-02",
      "2026-11-03",
      "2026-11-04",
    ]);
  });

  it("finds the Monday of a week", () => {
    expect(weekStartKey("2026-11-04")).toBe("2026-11-02"); // Wednesday -> Monday
    expect(weekStartKey("2026-11-02")).toBe("2026-11-02"); // Monday stays
    expect(weekStartKey("2026-11-01")).toBe("2026-10-26"); // Sunday belongs to the week before
  });
});

describe("daily progress", () => {
  const points = dailyProgress(sessions, "kid-1", "color-clash", 4, now);

  it("gives one point per day, oldest first", () => {
    expect(points.map((point) => point.key)).toEqual([
      "2026-11-01",
      "2026-11-02",
      "2026-11-03",
      "2026-11-04",
    ]);
  });

  it("keeps the best score of each day", () => {
    expect(points.map((point) => point.best)).toEqual([null, 12, null, 7]);
  });

  it("counts how many games were played", () => {
    expect(points.map((point) => point.plays)).toEqual([0, 2, 0, 1]);
  });

  it("shows empty days instead of hiding them", () => {
    expect(points[0]).toMatchObject({ best: null, plays: 0 });
  });

  it("never mixes kids or games", () => {
    const other = dailyProgress(sessions, "kid-1", "arrow-rush", 4, now);
    expect(other.map((point) => point.best)).toEqual([null, null, null, 30]);

    // kid-2 played Color Clash too, and must see only their own score (5),
    // never kid-1's 12.
    const otherKid = dailyProgress(sessions, "kid-2", "color-clash", 4, now);
    expect(otherKid.map((point) => point.best)).toEqual([null, null, null, 5]);
  });

  it("makes a readable label", () => {
    expect(points[3]?.label).toBe("Wed 4");
  });
});

describe("weekly progress", () => {
  it("groups by week, Monday first", () => {
    const weeks = weeklyProgress(sessions, "kid-1", "color-clash", 3, now);

    expect(weeks.map((week) => week.key)).toEqual(["2026-10-19", "2026-10-26", "2026-11-02"]);
    expect(weeks.map((week) => week.best)).toEqual([null, null, 12]);
    expect(weeks[2]?.plays).toBe(3);
    expect(weeks[2]?.label).toBe("2 Nov");
  });
});

describe("game summary", () => {
  it("reports best, last and how many times", () => {
    expect(gameSummary(sessions, "kid-1", "color-clash")).toEqual({
      best: 12,
      last: 7,
      plays: 3,
      lastPlayedDay: "2026-11-04",
    });
  });

  it("is empty for a game never played", () => {
    expect(gameSummary(sessions, "kid-1", "rule-switch")).toEqual({
      best: null,
      last: null,
      plays: 0,
      lastPlayedDay: null,
    });
  });
});

describe("recent plays", () => {
  it("lists this kid's games, newest first", () => {
    expect(recentPlays(sessions, "kid-1").map((item) => item.id)).toEqual(["d", "c", "b", "a"]);
  });

  it("can be cut to a few", () => {
    expect(recentPlays(sessions, "kid-1", 2).map((item) => item.id)).toEqual(["d", "c"]);
  });
});
