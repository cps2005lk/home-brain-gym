import type { FamilyData, GameSession, Kid } from "./types";

/**
 * How the app reads and writes data. The screens only ever see this interface,
 * so Milestone 5 can replace localStorage with Supabase and no screen changes.
 *
 * Every method returns a Promise, even the local one which is instant.
 * `Promise<T>` is TypeScript's `Task<T>`, and `async`/`await` work just like
 * C#. Starting async now means no rewrite when the real network arrives.
 */
export interface GymRepository {
  loadFamily(): Promise<FamilyData>;
  saveKid(kid: Kid): Promise<void>;
  addSession(session: GameSession): Promise<void>;
  /** The parent's "not my score" button. */
  deleteSession(sessionId: string): Promise<void>;
  setLastKid(kidId: string | null): Promise<void>;
}
