import { newId } from "../core/ids";
import { createDefaultFamilyData, GUEST_KID } from "./defaults";
import { parseFamilyData } from "./parse";
import type { GymRepository } from "./repository";
import type { FamilyData } from "./types";

export const STORAGE_KEY = "home-brain-gym/v1";

/** Keep storage from growing forever. Plenty for years of daily play. */
export const MAX_SESSIONS = 2_000;

/**
 * The small part of localStorage we use.
 *
 * TypeScript interfaces are *structural*: the real `localStorage` fits this
 * interface without being told about it, because it has methods of the right
 * shape. In C# a class must declare `: IKeyValueStorage` to fit. That is why a
 * plain object in a test can stand in for localStorage with no adapter.
 */
export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/**
 * `makeId` is a parameter with a default, so tests can pass predictable ids.
 * Same idea as injecting an IGuidProvider in C#.
 */
export function createLocalRepository(
  storage: KeyValueStorage,
  makeId: () => string = newId,
): GymRepository {
  function read(): FamilyData {
    const text = storage.getItem(STORAGE_KEY);
    if (text !== null) {
      try {
        const parsed = parseFamilyData(JSON.parse(text));
        if (parsed) return parsed;
      } catch {
        // Broken or hand-edited JSON: fall through and start fresh.
      }
    }
    const fresh = createDefaultFamilyData(makeId(), [makeId(), makeId()]);
    write(fresh);
    return fresh;
  }

  function write(data: FamilyData): void {
    storage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  /** Read, change, write back. `update` receives the current data. */
  function change(update: (data: FamilyData) => FamilyData): void {
    write(update(read()));
  }

  return {
    loadFamily: async () => read(),

    saveKid: async (kid) => {
      change((data) => ({
        ...data,
        kids: data.kids.map((existing) => (existing.id === kid.id ? kid : existing)),
      }));
    },

    addSession: async (session) => {
      // A guest leaves no trace.
      if (session.kidId === GUEST_KID.id) return;
      change((data) => {
        // Writing the same play twice must not create two rows.
        const others = data.sessions.filter((existing) => existing.id !== session.id);
        return { ...data, sessions: [...others, session].slice(-MAX_SESSIONS) };
      });
    },

    deleteSession: async (sessionId) => {
      change((data) => ({
        ...data,
        sessions: data.sessions.filter((session) => session.id !== sessionId),
      }));
    },

    setLastKid: async (kidId) => {
      change((data) => ({ ...data, lastKidId: kidId }));
    },
  };
}
