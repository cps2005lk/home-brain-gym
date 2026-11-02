import { LEVEL_IDS, type LevelId } from "../core/level";
import {
  AVATARS,
  KID_COLORS,
  type Avatar,
  type FamilyData,
  type GameSession,
  type Kid,
  type KidColor,
} from "./types";

/**
 * Anything that comes from outside the program - localStorage, a web request,
 * JSON.parse - arrives as `unknown`. `unknown` is like `object` in C#: you can
 * hold it, but you must check what it is before using it. (TypeScript also has
 * `any`, which switches all checking off. We never use `any`.)
 *
 * The functions below are *type guards*. The `value is X` return type tells the
 * compiler: "if this returns true, treat the value as X from here on." It is
 * the same job as `if (o is Kid kid)` in C#, written by hand.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const isString = (value: unknown): value is string => typeof value === "string";
const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const isLevel = (value: unknown): value is LevelId => LEVEL_IDS.some((level) => level === value);
const isAvatar = (value: unknown): value is Avatar => AVATARS.some((item) => item === value);
const isKidColor = (value: unknown): value is KidColor => KID_COLORS.some((item) => item === value);

function parseKid(raw: unknown): Kid | null {
  if (!isRecord(raw)) return null;
  const { id, familyId, name, level, avatar, color, dailyLimitMinutes } = raw;
  if (!isString(id) || !isString(familyId) || !isString(name)) return null;
  if (!isLevel(level) || !isAvatar(avatar) || !isKidColor(color)) return null;
  return {
    id,
    familyId,
    name,
    level,
    avatar,
    color,
    dailyLimitMinutes: isFiniteNumber(dailyLimitMinutes) ? dailyLimitMinutes : null,
  };
}

function parseSession(raw: unknown): GameSession | null {
  if (!isRecord(raw)) return null;
  const { id, kidId, gameId, level, score, detail, playedAt, durationMs } = raw;
  if (!isString(id) || !isString(kidId) || !isString(gameId) || !isString(playedAt)) return null;
  if (!isLevel(level) || !isFiniteNumber(score)) return null;
  return {
    id,
    kidId,
    gameId,
    level,
    score,
    detail: isString(detail) ? detail : "",
    playedAt,
    durationMs: isFiniteNumber(durationMs) ? durationMs : 0,
  };
}

/**
 * Turn saved text into FamilyData, or null if it is not usable.
 * A single broken kid or score is dropped; the rest is kept.
 */
export function parseFamilyData(raw: unknown): FamilyData | null {
  if (!isRecord(raw) || raw.version !== 1) return null;
  if (!isRecord(raw.family) || !isString(raw.family.id) || !isString(raw.family.name)) return null;
  if (!Array.isArray(raw.kids) || !Array.isArray(raw.sessions)) return null;

  // flatMap with [] drops the broken ones; it is like SelectMany in LINQ.
  const kids = raw.kids.flatMap((item) => {
    const kid = parseKid(item);
    return kid ? [kid] : [];
  });
  const sessions = raw.sessions.flatMap((item) => {
    const session = parseSession(item);
    return session ? [session] : [];
  });

  return {
    version: 1,
    family: { id: raw.family.id, name: raw.family.name },
    kids,
    sessions,
    lastKidId: isString(raw.lastKidId) ? raw.lastKidId : null,
  };
}
