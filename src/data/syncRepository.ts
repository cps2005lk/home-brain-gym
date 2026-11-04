import { GUEST_KID } from "./defaults";
import type { LocalCache } from "./localRepository";
import { flushQueue, type PendingQueue, type PendingWrite } from "./pendingQueue";
import type { GymRepository } from "./repository";
import type { FamilyData, GameSession, Kid } from "./types";

export interface SyncStatus {
  /** Did the last talk to the server work? */
  readonly online: boolean;
  /** How many changes are still waiting to be sent. */
  readonly pending: number;
  /** Why the last attempt failed, for the parent area. */
  readonly error: string | null;
}

const message = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/**
 * Local-first syncing.
 *
 * Writing: save on the device first, so a game is never lost - not even if the
 * WiFi dies in the middle of it. Then try the server; if that fails, the change
 * waits in the queue and goes up later.
 *
 * Reading: ask the server, and keep a copy of the answer on the device. If the
 * server cannot be reached, show that copy instead of an error.
 *
 * The screens see a plain GymRepository and know nothing about any of this.
 */
export function createSyncRepository(
  device: LocalCache,
  remote: GymRepository,
  queue: PendingQueue,
  onStatus: (status: SyncStatus) => void = () => {},
): GymRepository {
  function report(online: boolean, error: string | null): void {
    onStatus({ online, pending: queue.size(), error });
  }

  /** Send one change now, or put it in the queue for later. */
  async function sendOrQueue(write: PendingWrite): Promise<void> {
    try {
      switch (write.kind) {
        case "saveKid":
          await remote.saveKid(write.kid);
          break;
        case "addSession":
          await remote.addSession(write.session);
          break;
        case "deleteSession":
          await remote.deleteSession(write.sessionId);
          break;
      }
      report(true, null);
    } catch (error: unknown) {
      queue.add(write);
      report(false, message(error));
    }
  }

  return {
    loadFamily: async (): Promise<FamilyData> => {
      // Anything waiting from an earlier offline moment goes first.
      await flushQueue(queue, remote).catch(() => undefined);

      try {
        const fresh = await remote.loadFamily();
        // Keep a copy for the next time there is no internet.
        await device.replaceAll(fresh);
        report(true, null);
        return fresh;
      } catch (error: unknown) {
        report(false, message(error));
        return device.loadFamily();
      }
    },

    saveKid: async (kid: Kid): Promise<void> => {
      await device.saveKid(kid);
      await sendOrQueue({ kind: "saveKid", kid });
    },

    addSession: async (session: GameSession): Promise<void> => {
      await device.addSession(session);
      if (session.kidId === GUEST_KID.id) return; // a guest is never sent anywhere
      await sendOrQueue({ kind: "addSession", session });
    },

    deleteSession: async (sessionId: string): Promise<void> => {
      await device.deleteSession(sessionId);
      await sendOrQueue({ kind: "deleteSession", sessionId });
    },

    // Who played last is a fact about this device, so it never leaves it.
    setLastKid: (kidId: string | null): Promise<void> => device.setLastKid(kidId),
  };
}
