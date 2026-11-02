import type { LevelId } from "../core/level";

/** The tenant. Everything else belongs to one family. */
export interface Family {
  readonly id: string;
  readonly name: string;
}

/** Avatars a kid can choose. The emoji itself is the stored value - no mapping table. */
export const AVATARS = ["🐢", "🚀", "🦊", "🐙", "🐼", "🦄", "⚽", "🍌"] as const;
export type Avatar = (typeof AVATARS)[number];

/**
 * Colour names, not CSS values. The database stores "sun"; only the screen
 * knows that "sun" means var(--yellow). If we restyle the app later, old rows
 * still make sense.
 */
export const KID_COLORS = ["sun", "sky", "leaf", "berry"] as const;
export type KidColor = (typeof KID_COLORS)[number];

export const KID_COLOR_TOKENS: Record<KidColor, string> = {
  sun: "var(--yellow)",
  sky: "var(--blue)",
  leaf: "var(--green)",
  berry: "var(--red)",
};

/** A kid profile. No email, no password, no birthdate. */
export interface Kid {
  readonly id: string;
  readonly familyId: string;
  readonly name: string;
  readonly level: LevelId;
  readonly avatar: Avatar;
  readonly color: KidColor;
  /** Parent setting. null means no limit yet. Used from Milestone 8. */
  readonly dailyLimitMinutes: number | null;
}

/** One finished game. This is the row the charts and streaks will read. */
export interface GameSession {
  readonly id: string;
  readonly kidId: string;
  readonly gameId: string;
  readonly level: LevelId;
  readonly score: number;
  /** The extra line from GameProgress, for example "3 mistakes". */
  readonly detail: string;
  /** ISO text like "2026-11-02T19:30:00.000Z". Sorts correctly as text, and Postgres reads it. */
  readonly playedAt: string;
  readonly durationMs: number;
}

/** Everything the app keeps for one family. */
export interface FamilyData {
  /** Bumped if the shape ever changes, so old saved data can be upgraded. */
  readonly version: 1;
  readonly family: Family;
  readonly kids: readonly Kid[];
  readonly sessions: readonly GameSession[];
  /** Who played last on this device, so the picker can show them first. */
  readonly lastKidId: string | null;
}
