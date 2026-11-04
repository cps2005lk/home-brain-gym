import { beforeEach, describe, expect, it } from "vitest";
import { createDefaultFamilyData, GUEST_KID } from "./defaults";
import { createLocalRepository, type LocalCache } from "./localRepository";
import { createPendingQueue, type PendingQueue } from "./pendingQueue";
import { createFakeRemote, type FakeRemote } from "./repository-fake";
import { createFakeStorage } from "./storage-fake";
import { createSyncRepository, type SyncStatus } from "./syncRepository";
import type { GymRepository } from "./repository";
import type { GameSession } from "./types";

const family = createDefaultFamilyData("fam-1", ["kid-1", "kid-2"]);

const play = (id: string, score: number, kidId = "kid-1"): GameSession => ({
  id,
  kidId,
  gameId: "color-clash",
  level: "junior",
  score,
  detail: "1 mistake",
  playedAt: "2026-11-04T10:00:00.000Z",
  durationMs: 45_000,
});

describe("local-first syncing", () => {
  let device: LocalCache;
  let remote: FakeRemote;
  let queue: PendingQueue;
  let status: SyncStatus | null;
  let sync: GymRepository;

  beforeEach(async () => {
    const storage = createFakeStorage();
    device = createLocalRepository(storage, () => "fam-1");
    remote = createFakeRemote(family);
    queue = createPendingQueue(storage);
    status = null;
    sync = createSyncRepository(device, remote, queue, (next) => {
      status = next;
    });
    await sync.loadFamily();
  });

  it("writes to both places when the server answers", async () => {
    await sync.addSession(play("s1", 11));

    expect(remote.snapshot().sessions.map((s) => s.id)).toEqual(["s1"]);
    expect((await device.loadFamily()).sessions.map((s) => s.id)).toEqual(["s1"]);
    expect(queue.size()).toBe(0);
    expect(status?.online).toBe(true);
  });

  it("never loses a score when the server is unreachable", async () => {
    remote.offline = true;

    await sync.addSession(play("s1", 11));

    // The game is safe on the device...
    expect((await device.loadFamily()).sessions.map((s) => s.id)).toEqual(["s1"]);
    // ...and remembered for later.
    expect(queue.size()).toBe(1);
    expect(remote.snapshot().sessions).toEqual([]);
    expect(status?.online).toBe(false);
    expect(status?.error).toContain("network is down");
  });

  it("sends what was waiting as soon as the next load works", async () => {
    remote.offline = true;
    await sync.addSession(play("s1", 11));
    await sync.addSession(play("s2", 13));

    remote.offline = false;
    const loaded = await sync.loadFamily();

    expect(remote.snapshot().sessions.map((s) => s.id)).toEqual(["s1", "s2"]);
    expect(loaded.sessions.map((s) => s.id)).toEqual(["s1", "s2"]);
    expect(queue.size()).toBe(0);
    expect(status?.online).toBe(true);
  });

  it("shows the device copy while offline", async () => {
    await sync.addSession(play("s1", 11)); // saved everywhere
    remote.offline = true;

    const loaded = await sync.loadFamily();

    expect(loaded.sessions.map((s) => s.id)).toEqual(["s1"]);
    expect(loaded.kids).toHaveLength(2);
    expect(status?.online).toBe(false);
  });

  it("keeps a copy of the server data for the next offline moment", async () => {
    await remote.addSession(play("fromPhone", 20)); // played on another device

    await sync.loadFamily(); // this device catches up
    remote.offline = true;

    const offline = await sync.loadFamily();
    expect(offline.sessions.map((s) => s.id)).toEqual(["fromPhone"]);
  });

  it("queues a renamed kid and a deleted score too", async () => {
    remote.offline = true;
    const kid = family.kids[0];
    if (!kid) throw new Error("expected a kid");

    await sync.saveKid({ ...kid, name: "Nimal" });
    await sync.deleteSession("whatever");

    expect(queue.all().map((item) => item.kind)).toEqual(["saveKid", "deleteSession"]);

    remote.offline = false;
    await sync.loadFamily();
    expect(remote.snapshot().kids[0]?.name).toBe("Nimal");
    expect(queue.size()).toBe(0);
  });

  it("never sends a guest's game anywhere", async () => {
    await sync.addSession(play("g1", 7, GUEST_KID.id));

    expect(remote.snapshot().sessions).toEqual([]);
    expect(queue.size()).toBe(0);
    expect((await device.loadFamily()).sessions).toEqual([]);
  });

  it("keeps the last player on this device only", async () => {
    await sync.setLastKid("kid-2");

    expect((await device.loadFamily()).lastKidId).toBe("kid-2");
    expect(remote.snapshot().lastKidId).toBeNull();
  });
});
