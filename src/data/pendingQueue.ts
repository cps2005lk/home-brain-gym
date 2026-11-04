import type { KeyValueStorage } from "./localRepository";
import { parseKid, parseSession } from "./parse";
import type { GymRepository } from "./repository";
import type { GameSession, Kid } from "./types";

/**
 * A change that was saved on the device but has not reached the server yet.
 *
 * Another discriminated union. Every kind can be applied twice without harm:
 * a score is written by id (upsert), a kid is replaced by id, a delete by id
 * does nothing the second time. That is what makes retrying safe.
 */
export type PendingWrite =
  | { readonly kind: "saveKid"; readonly kid: Kid }
  | { readonly kind: "addSession"; readonly session: GameSession }
  | { readonly kind: "deleteSession"; readonly sessionId: string };

export const QUEUE_KEY = "home-brain-gym/pending/v1";

/** A sane ceiling, so a long time offline cannot fill up the browser storage. */
export const MAX_PENDING = 500;

export interface PendingQueue {
  all(): readonly PendingWrite[];
  add(write: PendingWrite): void;
  replace(writes: readonly PendingWrite[]): void;
  size(): number;
}

function parseWrite(raw: unknown): PendingWrite | null {
  if (typeof raw !== "object" || raw === null) return null;
  const value = raw as Record<string, unknown>;

  if (value.kind === "saveKid") {
    const kid = parseKid(value.kid);
    return kid ? { kind: "saveKid", kid } : null;
  }
  if (value.kind === "addSession") {
    const session = parseSession(value.session);
    return session ? { kind: "addSession", session } : null;
  }
  if (value.kind === "deleteSession" && typeof value.sessionId === "string") {
    return { kind: "deleteSession", sessionId: value.sessionId };
  }
  return null;
}

export function createPendingQueue(storage: KeyValueStorage): PendingQueue {
  function read(): readonly PendingWrite[] {
    const text = storage.getItem(QUEUE_KEY);
    if (text === null) return [];
    try {
      const raw: unknown = JSON.parse(text);
      if (!Array.isArray(raw)) return [];
      // Drop anything we no longer understand instead of crashing.
      return raw.flatMap((item) => {
        const write = parseWrite(item);
        return write ? [write] : [];
      });
    } catch {
      return [];
    }
  }

  function write(writes: readonly PendingWrite[]): void {
    storage.setItem(QUEUE_KEY, JSON.stringify(writes.slice(-MAX_PENDING)));
  }

  return {
    all: read,
    size: () => read().length,
    add: (item) => write([...read(), item]),
    replace: write,
  };
}

/** Send one waiting change to the server. */
async function applyWrite(remote: GymRepository, write: PendingWrite): Promise<void> {
  switch (write.kind) {
    case "saveKid":
      return remote.saveKid(write.kid);
    case "addSession":
      return remote.addSession(write.session);
    case "deleteSession":
      return remote.deleteSession(write.sessionId);
    default: {
      /**
       * If a new kind is added to PendingWrite and forgotten here, this line
       * stops compiling: only `never` can be assigned to `never`. It is a
       * compile-time "did you handle every case?" check, like a switch over a
       * C# enum that the compiler actually enforces.
       */
      const unhandled: never = write;
      throw new Error(`unknown pending write: ${JSON.stringify(unhandled)}`);
    }
  }
}

export interface FlushResult {
  readonly sent: number;
  readonly left: number;
}

/**
 * Try to send everything that is waiting, oldest first.
 *
 * It stops at the first failure and keeps the rest in order, because order can
 * matter: "save this score" followed by "delete that score" must not swap.
 */
export async function flushQueue(queue: PendingQueue, remote: GymRepository): Promise<FlushResult> {
  const waiting = queue.all();
  let sent = 0;

  for (const write of waiting) {
    try {
      await applyWrite(remote, write);
      sent += 1;
    } catch {
      break; // still offline, or the server refused: try again later
    }
  }

  const left = waiting.slice(sent);
  if (sent > 0) queue.replace(left);
  return { sent, left: left.length };
}
