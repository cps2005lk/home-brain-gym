import type { GymRepository } from "./repository";
import type { FamilyData, GameSession, Kid } from "./types";

/**
 * Test helper: a server we can switch off.
 *
 * Set `offline = true` and every call throws, exactly like a dead WiFi. No
 * mocking library needed - a plain object with the right methods already fits
 * the interface (structural typing again).
 */
export interface FakeRemote extends GymRepository {
  offline: boolean;
  snapshot(): FamilyData;
}

export function createFakeRemote(initial: FamilyData): FakeRemote {
  let data = initial;

  const check = (): void => {
    if (fake.offline) throw new Error("network is down");
  };

  const fake: FakeRemote = {
    offline: false,
    snapshot: () => data,

    loadFamily: async () => {
      check();
      return data;
    },

    saveKid: async (kid: Kid) => {
      check();
      data = {
        ...data,
        kids: data.kids.map((existing) => (existing.id === kid.id ? kid : existing)),
      };
    },

    addSession: async (session: GameSession) => {
      check();
      const others = data.sessions.filter((existing) => existing.id !== session.id);
      data = { ...data, sessions: [...others, session] };
    },

    deleteSession: async (sessionId: string) => {
      check();
      data = { ...data, sessions: data.sessions.filter((item) => item.id !== sessionId) };
    },

    setLastKid: async (kidId: string | null) => {
      check();
      data = { ...data, lastKidId: kidId };
    },
  };

  return fake;
}
