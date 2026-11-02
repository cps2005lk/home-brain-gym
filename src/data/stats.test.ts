import { describe, expect, it } from "vitest";
import { playsOnDay, sessionsFor, statsFor } from "./stats";
import type { GameSession } from "./types";

const play = (
  id: string,
  kidId: string,
  gameId: string,
  score: number,
  playedAt: string,
): GameSession => ({
  id,
  kidId,
  gameId,
  level: "junior",
  score,
  detail: "",
  playedAt,
  durationMs: 45_000,
});

const sessions: readonly GameSession[] = [
  play("3", "kid-1", "color-clash", 13, "2026-11-02T18:00:00.000Z"),
  play("1", "kid-1", "color-clash", 9, "2026-10-31T18:00:00.000Z"),
  play("2", "kid-1", "color-clash", 11, "2026-11-01T18:00:00.000Z"),
  play("4", "kid-1", "arrow-rush", 20, "2026-11-02T18:10:00.000Z"),
  play("5", "kid-2", "color-clash", 30, "2026-11-02T19:00:00.000Z"),
];

describe("sessionsFor", () => {
  it("keeps only this kid and this game, oldest first", () => {
    const mine = sessionsFor(sessions, "kid-1", "color-clash");
    expect(mine.map((session) => session.id)).toEqual(["1", "2", "3"]);
  });
});

describe("statsFor", () => {
  it("finds the best, the last and the recent scores", () => {
    expect(statsFor(sessions, "kid-1", "color-clash")).toEqual({
      best: 13,
      last: 13,
      recent: [9, 11, 13],
      playCount: 3,
    });
  });

  it("keeps the best even when the last score is lower", () => {
    const withDip = [...sessions, play("6", "kid-1", "color-clash", 7, "2026-11-03T18:00:00.000Z")];
    const stats = statsFor(withDip, "kid-1", "color-clash");
    expect(stats.best).toBe(13);
    expect(stats.last).toBe(7);
  });

  it("gives empty stats for a game never played", () => {
    expect(statsFor(sessions, "kid-1", "rule-switch")).toEqual({
      best: 0,
      last: null,
      recent: [],
      playCount: 0,
    });
  });

  it("shows only the last few scores in the little chart", () => {
    const many = Array.from({ length: 10 }, (_, index) =>
      play(`m${index}`, "kid-3", "arrow-rush", index, `2026-11-${10 + index}T10:00:00.000Z`),
    );
    expect(statsFor(many, "kid-3", "arrow-rush").recent).toEqual([3, 4, 5, 6, 7, 8, 9]);
  });

  it("never mixes two kids", () => {
    expect(statsFor(sessions, "kid-2", "color-clash").best).toBe(30);
    expect(statsFor(sessions, "kid-1", "color-clash").best).toBe(13);
  });
});

describe("playsOnDay", () => {
  it("counts the games a kid played on one day", () => {
    expect(playsOnDay(sessions, "kid-1", "2026-11-02")).toBe(2);
    expect(playsOnDay(sessions, "kid-1", "2026-10-31")).toBe(1);
    expect(playsOnDay(sessions, "kid-1", "2026-11-05")).toBe(0);
  });
});
