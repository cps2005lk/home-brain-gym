import { dayKey, FAMILY_TIME_ZONE } from "./progress";
import type { GameSession } from "./types";

/** A day counts towards the streak once this many games are finished. */
export const GAMES_PER_DAY = 2;

/**
 * A missed day is forgiven if the last forgiven day was at least this many
 * days earlier - "one rest day in any seven". Without it, one sick day would
 * wipe out a month of effort, which is how a 7-year-old learns to give up.
 */
export const REST_GAP_DAYS = 7;

const DAY_MS = 24 * 60 * 60 * 1000;

const addDays = (day: string, count: number): string =>
  new Date(new Date(`${day}T00:00:00Z`).getTime() + count * DAY_MS).toISOString().slice(0, 10);

const daysBetween = (from: string, to: string): number =>
  Math.round(
    (new Date(`${to}T00:00:00Z`).getTime() - new Date(`${from}T00:00:00Z`).getTime()) / DAY_MS,
  );

/** How many games this kid finished on each day, keyed by YYYY-MM-DD. */
export function playsByDay(
  sessions: readonly GameSession[],
  kidId: string,
  timeZone: string = FAMILY_TIME_ZONE,
): ReadonlyMap<string, number> {
  const counts = new Map<string, number>();
  for (const session of sessions) {
    if (session.kidId !== kidId) continue;
    const day = dayKey(session.playedAt, timeZone);
    counts.set(day, (counts.get(day) ?? 0) + 1);
  }
  return counts;
}

export interface StreakInfo {
  /** Days in a row right now. */
  readonly current: number;
  /** The best run this kid ever had. Badges use this. */
  readonly longest: number;
  readonly playsToday: number;
  readonly todayDone: boolean;
  /** Games still needed today to keep the streak alive. */
  readonly gamesLeftToday: number;
  /** True when a missed day in the last week was forgiven. */
  readonly restDayUsed: boolean;
}

export function streakInfo(
  sessions: readonly GameSession[],
  kidId: string,
  nowIso: string,
  timeZone: string = FAMILY_TIME_ZONE,
): StreakInfo {
  const counts = playsByDay(sessions, kidId, timeZone);
  const today = dayKey(nowIso, timeZone);
  const playsToday = counts.get(today) ?? 0;
  const todayDone = playsToday >= GAMES_PER_DAY;

  const played = [...counts.keys()].toSorted();
  const firstDay = played[0];
  if (firstDay === undefined) {
    return {
      current: 0,
      longest: 0,
      playsToday: 0,
      todayDone: false,
      gamesLeftToday: GAMES_PER_DAY,
      restDayUsed: false,
    };
  }

  /**
   * Walk forward one day at a time, from the first day ever played until
   * today, keeping the run going and remembering the best run seen.
   *
   * Today is only judged if it is already finished: an evening that has not
   * happened yet must not break a streak.
   */
  const lastDay = todayDone ? today : addDays(today, -1);
  let current = 0;
  let longest = 0;
  let lastRest: string | null = null;

  for (let day = firstDay; daysBetween(day, lastDay) >= 0; day = addDays(day, 1)) {
    const done = (counts.get(day) ?? 0) >= GAMES_PER_DAY;

    if (done) {
      current += 1;
    } else if (lastRest === null || daysBetween(lastRest, day) >= REST_GAP_DAYS) {
      lastRest = day; // forgiven, the run survives but does not grow
    } else {
      current = 0;
      lastRest = null;
    }

    longest = Math.max(longest, current);
  }

  return {
    current,
    longest,
    playsToday,
    todayDone,
    gamesLeftToday: Math.max(0, GAMES_PER_DAY - playsToday),
    restDayUsed: lastRest !== null && daysBetween(lastRest, today) < REST_GAP_DAYS,
  };
}

/* ---------------------------------------------------------------- badges */

export type BadgeId =
  "first-steps" | "seven-days" | "thirty-days" | "sharper" | "big-jump" | "full-house";

export interface Badge {
  readonly id: BadgeId;
  readonly emoji: string;
  readonly name: string;
  readonly how: string;
}

/** Every badge is about the kid's own play. None compares two kids. */
export const BADGES: readonly Badge[] = [
  { id: "first-steps", emoji: "🌱", name: "First Steps", how: "Finish your first game" },
  { id: "seven-days", emoji: "🔥", name: "Seven Days", how: "Keep a 7 day streak" },
  { id: "thirty-days", emoji: "🏅", name: "Thirty Days", how: "Keep a 30 day streak" },
  { id: "sharper", emoji: "⭐", name: "Sharper", how: "Beat your own best score" },
  { id: "big-jump", emoji: "🚀", name: "Big Jump", how: "Beat your own best by a quarter" },
  { id: "full-house", emoji: "🎯", name: "Full House", how: "Play all four games in one day" },
];

/** How much better than your own best counts as a Big Jump. */
export const BIG_JUMP = 1.25;

/**
 * Did this kid ever beat their own best? Each game is followed in time order,
 * and a score only counts if there was already a score to beat.
 */
function beatenOwnBest(played: readonly GameSession[], factor: number): boolean {
  const bestSoFar = new Map<string, number>();
  for (const session of played) {
    const previous = bestSoFar.get(session.gameId);
    if (previous !== undefined && previous > 0 && session.score >= previous * factor) return true;
    bestSoFar.set(session.gameId, Math.max(previous ?? 0, session.score));
  }
  return false;
}

export function earnedBadges(
  sessions: readonly GameSession[],
  kidId: string,
  gameIds: readonly string[],
  nowIso: string,
  timeZone: string = FAMILY_TIME_ZONE,
): readonly BadgeId[] {
  const played = sessions
    .filter((session) => session.kidId === kidId)
    .toSorted((a, b) => a.playedAt.localeCompare(b.playedAt));

  if (played.length === 0) return [];

  const { longest } = streakInfo(sessions, kidId, nowIso, timeZone);

  // Which games were played on each day, for Full House.
  const gamesPerDay = new Map<string, Set<string>>();
  for (const session of played) {
    const day = dayKey(session.playedAt, timeZone);
    const set = gamesPerDay.get(day) ?? new Set<string>();
    set.add(session.gameId);
    gamesPerDay.set(day, set);
  }
  const fullHouse = [...gamesPerDay.values()].some((set) =>
    gameIds.every((gameId) => set.has(gameId)),
  );

  const earned: BadgeId[] = ["first-steps"];
  if (longest >= 7) earned.push("seven-days");
  if (longest >= 30) earned.push("thirty-days");
  // "Sharper" means strictly better than before; factor 1 plus a nudge is not
  // enough, so beating by any amount uses > via factor slightly above 1.
  if (beatenOwnBest(played, 1.000001)) earned.push("sharper");
  if (beatenOwnBest(played, BIG_JUMP)) earned.push("big-jump");
  if (fullHouse) earned.push("full-house");

  // Keep the order of the BADGES list, so the screens are predictable.
  return BADGES.map((badge) => badge.id).filter((id) => earned.includes(id));
}

/** Badges in `after` that were not in `before`, for the result screen. */
export function newlyEarned(
  before: readonly BadgeId[],
  after: readonly BadgeId[],
): readonly BadgeId[] {
  return after.filter((id) => !before.includes(id));
}

export const badgeById = (id: BadgeId): Badge | undefined =>
  BADGES.find((badge) => badge.id === id);
