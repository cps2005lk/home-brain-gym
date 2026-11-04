import { describe, expect, it } from "vitest";
import { createDefaultFamilyData } from "./defaults";
import { createPendingQueue, flushQueue, QUEUE_KEY, type PendingWrite } from "./pendingQueue";
import { createFakeRemote } from "./repository-fake";
import { createFakeStorage } from "./storage-fake";
import type { GameSession } from "./types";

const play = (id: string, score: number): GameSession => ({
  id,
  kidId: "kid-1",
  gameId: "color-clash",
  level: "junior",
  score,
  detail: "",
  playedAt: "2026-11-04T10:00:00.000Z",
  durationMs: 45_000,
});

const addScore = (id: string, score: number): PendingWrite => ({
  kind: "addSession",
  session: play(id, score),
});

describe("pending queue", () => {
  it("starts empty", () => {
    expect(createPendingQueue(createFakeStorage()).all()).toEqual([]);
  });

  it("keeps changes in the order they were made", () => {
    const queue = createPendingQueue(createFakeStorage());
    queue.add(addScore("s1", 5));
    queue.add({ kind: "deleteSession", sessionId: "s0" });

    expect(queue.size()).toBe(2);
    expect(queue.all().map((item) => item.kind)).toEqual(["addSession", "deleteSession"]);
  });

  it("survives a reload of the app", () => {
    const storage = createFakeStorage();
    createPendingQueue(storage).add(addScore("s1", 5));

    // A new queue over the same storage, as if the page was reloaded.
    expect(createPendingQueue(storage).size()).toBe(1);
  });

  it("ignores broken or unknown entries", () => {
    const storage = createFakeStorage({
      [QUEUE_KEY]: JSON.stringify([
        { kind: "addSession", session: { id: "oops" } }, // not a real session
        { kind: "somethingElse" },
        { kind: "deleteSession", sessionId: "s9" },
      ]),
    });

    expect(createPendingQueue(storage).all()).toEqual([{ kind: "deleteSession", sessionId: "s9" }]);
  });

  it("ignores rubbish text", () => {
    const storage = createFakeStorage({ [QUEUE_KEY]: "{not json" });
    expect(createPendingQueue(storage).all()).toEqual([]);
  });
});

describe("flushing the queue", () => {
  const family = createDefaultFamilyData("fam-1", ["kid-1", "kid-2"]);

  it("sends everything when the server answers", async () => {
    const queue = createPendingQueue(createFakeStorage());
    const remote = createFakeRemote(family);
    queue.add(addScore("s1", 5));
    queue.add(addScore("s2", 9));

    expect(await flushQueue(queue, remote)).toEqual({ sent: 2, left: 0 });
    expect(queue.size()).toBe(0);
    expect(remote.snapshot().sessions.map((s) => s.id)).toEqual(["s1", "s2"]);
  });

  it("keeps everything when the server is down", async () => {
    const queue = createPendingQueue(createFakeStorage());
    const remote = createFakeRemote(family);
    remote.offline = true;
    queue.add(addScore("s1", 5));

    expect(await flushQueue(queue, remote)).toEqual({ sent: 0, left: 1 });
    expect(queue.size()).toBe(1);
  });

  it("stops at the first failure and keeps the rest in order", async () => {
    const queue = createPendingQueue(createFakeStorage());
    const remote = createFakeRemote(family);
    queue.add(addScore("s1", 5));
    queue.add(addScore("s2", 9));
    queue.add(addScore("s3", 12));

    // Let the first one through, then "lose" the connection.
    let calls = 0;
    const flaky = {
      ...remote,
      addSession: async (session: GameSession) => {
        calls += 1;
        if (calls > 1) throw new Error("network is down");
        await remote.addSession(session);
      },
    };

    expect(await flushQueue(queue, flaky)).toEqual({ sent: 1, left: 2 });
    expect(queue.all().map((item) => (item.kind === "addSession" ? item.session.id : ""))).toEqual([
      "s2",
      "s3",
    ]);
  });

  it("does nothing when there is nothing waiting", async () => {
    const queue = createPendingQueue(createFakeStorage());
    expect(await flushQueue(queue, createFakeRemote(family))).toEqual({ sent: 0, left: 0 });
  });
});
