import type { GameSession } from "./types";

export interface GameStats {
  /** Best score ever for this kid and this game. 0 if never played. */
  readonly best: number;
  /** Most recent score, or null if never played. */
  readonly last: number | null;
  /** The last few scores, oldest first, for the little bar chart. */
  readonly recent: readonly number[];
  readonly playCount: number;
}

/** One kid's plays of one game, oldest first. */
export function sessionsFor(
  sessions: readonly GameSession[],
  kidId: string,
  gameId: string,
): readonly GameSession[] {
  return sessions
    .filter((session) => session.kidId === kidId && session.gameId === gameId)
    .toSorted((a, b) => a.playedAt.localeCompare(b.playedAt));
}

export function statsFor(
  sessions: readonly GameSession[],
  kidId: string,
  gameId: string,
  recentCount = 7,
): GameStats {
  const mine = sessionsFor(sessions, kidId, gameId);
  const scores = mine.map((session) => session.score);
  return {
    best: scores.reduce((highest, score) => Math.max(highest, score), 0),
    last: scores.length > 0 ? (scores[scores.length - 1] ?? null) : null,
    recent: scores.slice(-recentCount),
    playCount: scores.length,
  };
}

/** How many games this kid played today, used by the home screen header. */
export function playsOnDay(
  sessions: readonly GameSession[],
  kidId: string,
  dayIso: string,
): number {
  return sessions.filter(
    (session) => session.kidId === kidId && session.playedAt.startsWith(dayIso),
  ).length;
}
