import type { GameSession } from "./types";

/**
 * All "which day was that?" questions use the family's own time zone, not the
 * device's. A tablet left on another time zone must not move a score to
 * yesterday. Sri Lanka has no summer time, so a day here is always 24 hours.
 */
export const FAMILY_TIME_ZONE = "Asia/Colombo";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * "2026-11-04" for an instant, in the family's time zone.
 *
 * `Intl.DateTimeFormat` with the "en-CA" locale prints dates as YYYY-MM-DD,
 * which is both easy to read and correct to sort as plain text.
 */
export function dayKey(isoInstant: string, timeZone: string = FAMILY_TIME_ZONE): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(isoInstant));
}

/** Short label for a chart axis, for example "Wed 4". */
export function dayLabel(dayKeyText: string, timeZone: string = FAMILY_TIME_ZONE): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    weekday: "short",
    day: "numeric",
  }).format(new Date(`${dayKeyText}T12:00:00Z`));
}

/** Short label for a week, for example "4 Nov". */
export function weekLabel(dayKeyText: string, timeZone: string = FAMILY_TIME_ZONE): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    day: "numeric",
    month: "short",
  }).format(new Date(`${dayKeyText}T12:00:00Z`));
}

/** The Monday of the week a day belongs to, as another YYYY-MM-DD key. */
export function weekStartKey(dayKeyText: string): string {
  const [year, month, day] = dayKeyText.split("-").map(Number);
  if (year === undefined || month === undefined || day === undefined) return dayKeyText;
  const at = Date.UTC(year, month - 1, day);
  // getUTCDay(): 0 = Sunday. We want Monday first, so Sunday counts as 6.
  const weekday = (new Date(at).getUTCDay() + 6) % 7;
  return new Date(at - weekday * DAY_MS).toISOString().slice(0, 10);
}

/** The last `count` day keys, oldest first, ending on the day of `nowIso`. */
export function lastDays(
  count: number,
  nowIso: string,
  timeZone: string = FAMILY_TIME_ZONE,
): readonly string[] {
  const now = new Date(nowIso).getTime();
  return Array.from({ length: count }, (_, index) =>
    dayKey(new Date(now - (count - 1 - index) * DAY_MS).toISOString(), timeZone),
  );
}

export interface ProgressPoint {
  /** YYYY-MM-DD: the day, or the Monday of the week. */
  readonly key: string;
  readonly label: string;
  /** Best score that day or week; null when nothing was played. */
  readonly best: number | null;
  readonly plays: number;
}

interface ProgressOptions {
  readonly nowIso: string;
  readonly timeZone?: string;
}

function mine(
  sessions: readonly GameSession[],
  kidId: string,
  gameId: string,
): readonly GameSession[] {
  return sessions.filter((item) => item.kidId === kidId && item.gameId === gameId);
}

/**
 * Best score for each of the last `days` days. Days with no game are kept with
 * best = null, so the chart shows the gaps instead of hiding them.
 */
export function dailyProgress(
  sessions: readonly GameSession[],
  kidId: string,
  gameId: string,
  days: number,
  { nowIso, timeZone = FAMILY_TIME_ZONE }: ProgressOptions,
): readonly ProgressPoint[] {
  const played = mine(sessions, kidId, gameId);

  return lastDays(days, nowIso, timeZone).map((key) => {
    const onThatDay = played.filter((item) => dayKey(item.playedAt, timeZone) === key);
    return {
      key,
      label: dayLabel(key, timeZone),
      best: onThatDay.length > 0 ? Math.max(...onThatDay.map((item) => item.score)) : null,
      plays: onThatDay.length,
    };
  });
}

/** The same, grouped into weeks that start on Monday. */
export function weeklyProgress(
  sessions: readonly GameSession[],
  kidId: string,
  gameId: string,
  weeks: number,
  { nowIso, timeZone = FAMILY_TIME_ZONE }: ProgressOptions,
): readonly ProgressPoint[] {
  const played = mine(sessions, kidId, gameId);
  const thisWeek = weekStartKey(dayKey(nowIso, timeZone));
  const thisWeekMs = new Date(`${thisWeek}T00:00:00Z`).getTime();

  return Array.from({ length: weeks }, (_, index) => {
    const key = new Date(thisWeekMs - (weeks - 1 - index) * 7 * DAY_MS).toISOString().slice(0, 10);
    const inThatWeek = played.filter(
      (item) => weekStartKey(dayKey(item.playedAt, timeZone)) === key,
    );
    return {
      key,
      label: weekLabel(key, timeZone),
      best: inThatWeek.length > 0 ? Math.max(...inThatWeek.map((item) => item.score)) : null,
      plays: inThatWeek.length,
    };
  });
}

export interface GameSummary {
  readonly best: number | null;
  readonly last: number | null;
  readonly plays: number;
  /** YYYY-MM-DD of the most recent game, or null. */
  readonly lastPlayedDay: string | null;
}

export function gameSummary(
  sessions: readonly GameSession[],
  kidId: string,
  gameId: string,
  timeZone: string = FAMILY_TIME_ZONE,
): GameSummary {
  const played = mine(sessions, kidId, gameId).toSorted((a, b) =>
    a.playedAt.localeCompare(b.playedAt),
  );
  const newest = played[played.length - 1];

  return {
    best: played.length > 0 ? Math.max(...played.map((item) => item.score)) : null,
    last: newest?.score ?? null,
    plays: played.length,
    lastPlayedDay: newest ? dayKey(newest.playedAt, timeZone) : null,
  };
}

/** Newest games first, for the parent's "remove a wrong score" list. */
export function recentPlays(
  sessions: readonly GameSession[],
  kidId: string,
  limit = 20,
): readonly GameSession[] {
  return sessions
    .filter((item) => item.kidId === kidId)
    .toSorted((a, b) => b.playedAt.localeCompare(a.playedAt))
    .slice(0, limit);
}
