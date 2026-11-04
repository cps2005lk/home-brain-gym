import { isAvatar, isKidColor } from "./parse";
import type { Database } from "./database.types";
import type { GameSession, Kid } from "./types";

/**
 * `Database["public"]["Tables"]["kids"]["Row"]` reads long, but it is worth it:
 * these types come from the real database, so if a column is renamed in SQL,
 * this file stops compiling. That is the whole reason we generate them.
 */
type KidRow = Database["public"]["Tables"]["kids"]["Row"];
type KidInsert = Database["public"]["Tables"]["kids"]["Insert"];
type SessionRow = Database["public"]["Tables"]["sessions"]["Row"];
type SessionInsert = Database["public"]["Tables"]["sessions"]["Insert"];

/**
 * Two small differences the mappers hide from the rest of the app:
 * - SQL uses snake_case (daily_limit_minutes), TypeScript uses camelCase
 * - avatar and colour are plain text in Postgres, so we check them here and
 *   fall back to a default if a row holds something we do not know
 */
export function kidFromRow(row: KidRow): Kid {
  return {
    id: row.id,
    familyId: row.family_id,
    name: row.name,
    level: row.level,
    avatar: isAvatar(row.avatar) ? row.avatar : "🐢",
    color: isKidColor(row.color) ? row.color : "sun",
    dailyLimitMinutes: row.daily_limit_minutes,
  };
}

export function kidToRow(kid: Kid): KidInsert {
  return {
    id: kid.id,
    family_id: kid.familyId,
    name: kid.name,
    level: kid.level,
    avatar: kid.avatar,
    color: kid.color,
    daily_limit_minutes: kid.dailyLimitMinutes,
  };
}

export function sessionFromRow(row: SessionRow): GameSession {
  return {
    id: row.id,
    kidId: row.kid_id,
    gameId: row.game_id,
    level: row.level,
    score: row.score,
    detail: row.detail,
    // Postgres returns "+00:00"; the app uses "Z" everywhere, so normalise.
    playedAt: new Date(row.played_at).toISOString(),
    durationMs: row.duration_ms,
  };
}

export function sessionToRow(session: GameSession, familyId: string): SessionInsert {
  return {
    id: session.id,
    family_id: familyId,
    kid_id: session.kidId,
    game_id: session.gameId,
    level: session.level,
    score: session.score,
    detail: session.detail,
    played_at: session.playedAt,
    duration_ms: session.durationMs,
  };
}
