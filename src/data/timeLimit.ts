import { dayKey, FAMILY_TIME_ZONE } from "./progress";
import type { GameSession, Kid } from "./types";

/** The choices the parent gets in settings. null means "no limit". */
export const LIMIT_CHOICES: readonly (number | null)[] = [null, 10, 15, 20, 30, 45];

const MS_PER_MINUTE = 60_000;

export interface TimeLimitStatus {
  /** What the parent set, or null for no limit. */
  readonly limitMinutes: number | null;
  /** Time played today, in milliseconds. */
  readonly usedMs: number;
  /** Whole minutes played today, rounded down - "12 minutes used". */
  readonly usedMinutes: number;
  /** Whole minutes still allowed, rounded up. null when there is no limit. */
  readonly leftMinutes: number | null;
  /**
   * May a new game start?
   *
   * A game that is already running always finishes and always counts - a kid
   * must never lose a score in the middle of playing. Only *starting* is
   * blocked.
   */
  readonly canStartGame: boolean;
}

/** How long this kid played today, in milliseconds. */
export function playedTodayMs(
  sessions: readonly GameSession[],
  kidId: string,
  nowIso: string,
  timeZone: string = FAMILY_TIME_ZONE,
): number {
  const today = dayKey(nowIso, timeZone);
  return sessions
    .filter((session) => session.kidId === kidId && dayKey(session.playedAt, timeZone) === today)
    .reduce((total, session) => total + session.durationMs, 0);
}

export function timeLimitStatus(
  kid: Kid,
  sessions: readonly GameSession[],
  nowIso: string,
  timeZone: string = FAMILY_TIME_ZONE,
): TimeLimitStatus {
  const usedMs = playedTodayMs(sessions, kid.id, nowIso, timeZone);
  const usedMinutes = Math.floor(usedMs / MS_PER_MINUTE);
  const limitMinutes = kid.dailyLimitMinutes;

  if (limitMinutes === null || limitMinutes <= 0) {
    return { limitMinutes: null, usedMs, usedMinutes, leftMinutes: null, canStartGame: true };
  }

  const leftMs = limitMinutes * MS_PER_MINUTE - usedMs;
  return {
    limitMinutes,
    usedMs,
    usedMinutes,
    leftMinutes: Math.max(0, Math.ceil(leftMs / MS_PER_MINUTE)),
    canStartGame: leftMs > 0,
  };
}

/** Short line for the kid tile and the home screen. */
export function timeLeftLabel(status: TimeLimitStatus): string | null {
  if (status.limitMinutes === null) return null;
  if (!status.canStartGame) return "Time is up for today";
  return `${status.leftMinutes ?? 0} min left today`;
}
