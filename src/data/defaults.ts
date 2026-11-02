import type { FamilyData, Kid } from "./types";

/**
 * A visitor can play without saving anything. The guest is not stored in the
 * family, so nothing is ever written for this id.
 */
export const GUEST_KID: Kid = {
  id: "guest",
  familyId: "guest",
  name: "Guest",
  level: "junior",
  avatar: "⚽",
  color: "leaf",
  dailyLimitMinutes: null,
};

export const isGuest = (kid: Kid): boolean => kid.id === GUEST_KID.id;

/** First run on a device: one family, two kids the parent can rename. */
export function createDefaultFamilyData(familyId: string, kidIds: readonly string[]): FamilyData {
  const [firstKidId = "kid-1", secondKidId = "kid-2"] = kidIds;
  return {
    version: 1,
    family: { id: familyId, name: "My family" },
    kids: [
      {
        id: firstKidId,
        familyId,
        name: "Little one",
        level: "junior",
        avatar: "🐢",
        color: "sun",
        dailyLimitMinutes: null,
      },
      {
        id: secondKidId,
        familyId,
        name: "Big one",
        level: "teen",
        avatar: "🚀",
        color: "sky",
        dailyLimitMinutes: null,
      },
    ],
    sessions: [],
    lastKidId: null,
  };
}
