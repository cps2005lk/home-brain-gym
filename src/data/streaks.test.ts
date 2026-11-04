import { describe, expect, it } from "vitest";
import { earnedBadges, GAMES_PER_DAY, newlyEarned, streakInfo } from "./streaks";
import type { GameSession } from "./types";

const GAME_IDS = ["color-clash", "pattern-memory", "rule-switch", "arrow-rush"];

let counter = 0;

/** One finished game, at midday Sri Lanka time on the given day. */
function play(day: string, score = 10, gameId = "color-clash", kidId = "kid-1"): GameSession {
  counter += 1;
  return {
    id: `s${counter}`,
    kidId,
    gameId,
    level: "junior",
    score,
    detail: "",
    // 06:30 UTC is 12:00 in Colombo, safely inside the day.
    playedAt: `${day}T06:30:00.000Z`,
    durationMs: 45_000,
  };
}

/** A full day: enough games to count. */
const fullDay = (day: string, score = 10): GameSession[] =>
  Array.from({ length: GAMES_PER_DAY }, (_, index) =>
    play(day, score, index === 0 ? "color-clash" : "arrow-rush"),
  );

const noon = (day: string): string => `${day}T06:30:00.000Z`;

describe("what makes a day count", () => {
  it("needs two games", () => {
    const one = streakInfo([play("2026-11-04")], "kid-1", noon("2026-11-04"));
    expect(one.playsToday).toBe(1);
    expect(one.todayDone).toBe(false);
    expect(one.gamesLeftToday).toBe(1);
    expect(one.current).toBe(0);

    const two = streakInfo(fullDay("2026-11-04"), "kid-1", noon("2026-11-04"));
    expect(two.todayDone).toBe(true);
    expect(two.gamesLeftToday).toBe(0);
    expect(two.current).toBe(1);
  });

  it("is empty for a kid who never played", () => {
    expect(streakInfo([], "kid-1", noon("2026-11-04"))).toEqual({
      current: 0,
      longest: 0,
      playsToday: 0,
      todayDone: false,
      gamesLeftToday: 2,
      restDayUsed: false,
    });
  });

  it("counts only this kid", () => {
    const sessions = [
      ...fullDay("2026-11-04"),
      ...fullDay("2026-11-04").map((s) => ({ ...s, kidId: "kid-2" })),
    ];
    expect(streakInfo(sessions, "kid-2", noon("2026-11-04")).current).toBe(1);
  });
});

describe("the streak", () => {
  it("grows with days in a row", () => {
    const sessions = [...fullDay("2026-11-02"), ...fullDay("2026-11-03"), ...fullDay("2026-11-04")];
    expect(streakInfo(sessions, "kid-1", noon("2026-11-04")).current).toBe(3);
  });

  it("is not broken by today being unfinished", () => {
    // Played Mon and Tue; it is Wednesday lunchtime and nothing yet today.
    const sessions = [...fullDay("2026-11-02"), ...fullDay("2026-11-03")];
    const info = streakInfo(sessions, "kid-1", noon("2026-11-04"));

    expect(info.current).toBe(2);
    expect(info.todayDone).toBe(false);
    expect(info.gamesLeftToday).toBe(2);
  });

  it("forgives one missed day", () => {
    // Mon, Tue, (Wed missed), Thu
    const sessions = [...fullDay("2026-11-02"), ...fullDay("2026-11-03"), ...fullDay("2026-11-05")];
    const info = streakInfo(sessions, "kid-1", noon("2026-11-05"));

    expect(info.current).toBe(3); // the three days played
    expect(info.restDayUsed).toBe(true);
  });

  it("resets after a second missed day in the same week", () => {
    // Mon, (Tue missed), Wed, (Thu missed), Fri
    const sessions = [...fullDay("2026-11-02"), ...fullDay("2026-11-04"), ...fullDay("2026-11-06")];
    expect(streakInfo(sessions, "kid-1", noon("2026-11-06")).current).toBe(1);
  });

  it("allows another rest day once a week has passed", () => {
    // Rest on 3 Nov, then played daily, rest again on 11 Nov (8 days later)
    const sessions = [
      ...fullDay("2026-11-02"),
      ...fullDay("2026-11-04"),
      ...fullDay("2026-11-05"),
      ...fullDay("2026-11-06"),
      ...fullDay("2026-11-07"),
      ...fullDay("2026-11-08"),
      ...fullDay("2026-11-09"),
      ...fullDay("2026-11-10"),
      ...fullDay("2026-11-12"),
    ];
    expect(streakInfo(sessions, "kid-1", noon("2026-11-12")).current).toBe(9);
  });

  it("remembers the best run even after it is lost", () => {
    const sessions = [
      ...fullDay("2026-10-01"),
      ...fullDay("2026-10-02"),
      ...fullDay("2026-10-03"),
      // long gap: streak lost
      ...fullDay("2026-11-04"),
    ];
    const info = streakInfo(sessions, "kid-1", noon("2026-11-04"));

    expect(info.current).toBe(1);
    expect(info.longest).toBe(3);
  });
});

describe("badges", () => {
  const now = noon("2026-11-04");

  it("gives nothing before the first game", () => {
    expect(earnedBadges([], "kid-1", GAME_IDS, now)).toEqual([]);
  });

  it("gives First Steps for the first game", () => {
    expect(earnedBadges([play("2026-11-04")], "kid-1", GAME_IDS, now)).toEqual(["first-steps"]);
  });

  it("gives Sharper for beating your own best", () => {
    const sessions = [play("2026-11-03", 10), play("2026-11-04", 11)];
    expect(earnedBadges(sessions, "kid-1", GAME_IDS, now)).toContain("sharper");
  });

  it("does not give Sharper for a first score or a worse one", () => {
    expect(earnedBadges([play("2026-11-04", 50)], "kid-1", GAME_IDS, now)).not.toContain("sharper");

    const worse = [play("2026-11-03", 10), play("2026-11-04", 9)];
    expect(earnedBadges(worse, "kid-1", GAME_IDS, now)).not.toContain("sharper");
  });

  it("gives Big Jump only for a quarter better", () => {
    const small = [play("2026-11-03", 10), play("2026-11-04", 12)];
    expect(earnedBadges(small, "kid-1", GAME_IDS, now)).not.toContain("big-jump");

    const big = [play("2026-11-03", 10), play("2026-11-04", 13)];
    expect(earnedBadges(big, "kid-1", GAME_IDS, now)).toContain("big-jump");
  });

  it("gives Full House for all four games in one day", () => {
    const threeGames = GAME_IDS.slice(0, 3).map((gameId) => play("2026-11-04", 5, gameId));
    expect(earnedBadges(threeGames, "kid-1", GAME_IDS, now)).not.toContain("full-house");

    const allFour = GAME_IDS.map((gameId) => play("2026-11-04", 5, gameId));
    expect(earnedBadges(allFour, "kid-1", GAME_IDS, now)).toContain("full-house");
  });

  it("does not give Full House for four games spread over two days", () => {
    const split = [
      play("2026-11-03", 5, "color-clash"),
      play("2026-11-03", 5, "pattern-memory"),
      play("2026-11-04", 5, "rule-switch"),
      play("2026-11-04", 5, "arrow-rush"),
    ];
    expect(earnedBadges(split, "kid-1", GAME_IDS, now)).not.toContain("full-house");
  });

  it("gives Seven Days for a seven day streak", () => {
    const week = [
      ...fullDay("2026-10-29"),
      ...fullDay("2026-10-30"),
      ...fullDay("2026-10-31"),
      ...fullDay("2026-11-01"),
      ...fullDay("2026-11-02"),
      ...fullDay("2026-11-03"),
      ...fullDay("2026-11-04"),
    ];
    const badges = earnedBadges(week, "kid-1", GAME_IDS, now);

    expect(badges).toContain("seven-days");
    expect(badges).not.toContain("thirty-days");
  });

  it("keeps the badges in a fixed order", () => {
    const sessions = [
      ...fullDay("2026-11-03", 10),
      ...GAME_IDS.map((gameId) => play("2026-11-04", 40, gameId)),
    ];
    expect(earnedBadges(sessions, "kid-1", GAME_IDS, now)).toEqual([
      "first-steps",
      "sharper",
      "big-jump",
      "full-house",
    ]);
  });

  it("finds the badges that are new after a game", () => {
    expect(newlyEarned(["first-steps"], ["first-steps", "sharper"])).toEqual(["sharper"]);
    expect(newlyEarned(["first-steps"], ["first-steps"])).toEqual([]);
  });
});
