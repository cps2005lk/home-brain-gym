import { describe, expect, it } from "vitest";
import { playedTodayMs, timeLeftLabel, timeLimitStatus } from "./timeLimit";
import type { GameSession, Kid } from "./types";

const kid: Kid = {
  id: "kid-1",
  familyId: "fam-1",
  name: "Little one",
  level: "junior",
  avatar: "🐢",
  color: "sun",
  dailyLimitMinutes: 15,
};

let counter = 0;

/** A game of `minutes`, played at midday Colombo time on that day. */
function play(day: string, minutes: number, kidId = "kid-1"): GameSession {
  counter += 1;
  return {
    id: `s${counter}`,
    kidId,
    gameId: "color-clash",
    level: "junior",
    score: 10,
    detail: "",
    playedAt: `${day}T06:30:00.000Z`,
    durationMs: minutes * 60_000,
  };
}

const noon = (day: string): string => `${day}T06:30:00.000Z`;
const withLimit = (minutes: number | null): Kid => ({ ...kid, dailyLimitMinutes: minutes });

describe("time played today", () => {
  it("adds up today's games only", () => {
    const sessions = [
      play("2026-11-03", 10), // yesterday
      play("2026-11-04", 4),
      play("2026-11-04", 3),
    ];
    expect(playedTodayMs(sessions, "kid-1", noon("2026-11-04"))).toBe(7 * 60_000);
  });

  it("uses Sri Lanka days, so a late game belongs to the right day", () => {
    // 19:00 UTC on the 3rd is 00:30 on the 4th in Colombo
    const lateNight: GameSession = {
      ...play("2026-11-03", 5),
      playedAt: "2026-11-03T19:00:00.000Z",
    };
    expect(playedTodayMs([lateNight], "kid-1", noon("2026-11-04"))).toBe(5 * 60_000);
  });

  it("counts only this kid", () => {
    const sessions = [play("2026-11-04", 5), play("2026-11-04", 30, "kid-2")];
    expect(playedTodayMs(sessions, "kid-1", noon("2026-11-04"))).toBe(5 * 60_000);
  });
});

describe("the daily limit", () => {
  const now = noon("2026-11-04");

  it("allows everything when no limit is set", () => {
    const status = timeLimitStatus(withLimit(null), [play("2026-11-04", 99)], now);
    expect(status).toMatchObject({ limitMinutes: null, leftMinutes: null, canStartGame: true });
    expect(timeLeftLabel(status)).toBeNull();
  });

  it("counts the minutes left", () => {
    const status = timeLimitStatus(kid, [play("2026-11-04", 6)], now);

    expect(status.usedMinutes).toBe(6);
    expect(status.leftMinutes).toBe(9);
    expect(status.canStartGame).toBe(true);
    expect(timeLeftLabel(status)).toBe("9 min left today");
  });

  it("stops new games once the limit is reached exactly", () => {
    const status = timeLimitStatus(kid, [play("2026-11-04", 15)], now);

    expect(status.leftMinutes).toBe(0);
    expect(status.canStartGame).toBe(false);
    expect(timeLeftLabel(status)).toBe("Time is up for today");
  });

  it("never shows a negative number when the limit is passed", () => {
    const status = timeLimitStatus(kid, [play("2026-11-04", 20)], now);

    expect(status.leftMinutes).toBe(0);
    expect(status.usedMinutes).toBe(20);
    expect(status.canStartGame).toBe(false);
  });

  it("starts again the next day", () => {
    const yesterdayFull = [play("2026-11-03", 20)];
    expect(timeLimitStatus(kid, yesterdayFull, noon("2026-11-04")).canStartGame).toBe(true);
    expect(timeLimitStatus(kid, yesterdayFull, noon("2026-11-03")).canStartGame).toBe(false);
  });

  it("rounds part minutes in the kid's favour", () => {
    // 14 minutes 20 seconds used of 15
    const almost: GameSession = { ...play("2026-11-04", 0), durationMs: 14 * 60_000 + 20_000 };
    const status = timeLimitStatus(kid, [almost], now);

    expect(status.usedMinutes).toBe(14); // whole minutes used
    expect(status.leftMinutes).toBe(1); // 40 seconds left shows as 1 minute
    expect(status.canStartGame).toBe(true); // and a new game may still start
  });

  it("treats a zero or silly limit as no limit", () => {
    expect(timeLimitStatus(withLimit(0), [play("2026-11-04", 99)], now).canStartGame).toBe(true);
  });
});
