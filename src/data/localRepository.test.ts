import { describe, expect, it } from "vitest";
import { GUEST_KID } from "./defaults";
import { createLocalRepository, STORAGE_KEY } from "./localRepository";
import { createFakeStorage } from "./storage-fake";
import type { GameSession } from "./types";

/** Predictable ids: id-1, id-2, id-3... */
function countingIds(): () => string {
  let next = 0;
  return () => {
    next += 1;
    return `id-${next}`;
  };
}

const session = (overrides: Partial<GameSession> = {}): GameSession => ({
  id: "s1",
  kidId: "id-2",
  gameId: "color-clash",
  level: "junior",
  score: 11,
  detail: "2 mistakes",
  playedAt: "2026-11-02T10:00:00.000Z",
  durationMs: 45_000,
  ...overrides,
});

describe("local repository", () => {
  it("creates a family with two kids on first use", async () => {
    const repo = createLocalRepository(createFakeStorage(), countingIds());
    const data = await repo.loadFamily();

    expect(data.family.id).toBe("id-1");
    expect(data.kids.map((kid) => kid.name)).toEqual(["Little one", "Big one"]);
    expect(data.kids.map((kid) => kid.level)).toEqual(["junior", "teen"]);
    expect(data.sessions).toEqual([]);
  });

  it("keeps the same family on the next visit", async () => {
    const storage = createFakeStorage();
    const first = await createLocalRepository(storage, countingIds()).loadFamily();
    const second = await createLocalRepository(storage, countingIds()).loadFamily();
    expect(second).toEqual(first);
  });

  it("saves a renamed kid", async () => {
    const storage = createFakeStorage();
    const repo = createLocalRepository(storage, countingIds());
    const data = await repo.loadFamily();
    const kid = data.kids[0];
    if (!kid) throw new Error("expected a kid");

    await repo.saveKid({ ...kid, name: "Nimal", avatar: "🦊", level: "teen" });
    const reloaded = await repo.loadFamily();

    expect(reloaded.kids[0]?.name).toBe("Nimal");
    expect(reloaded.kids[0]?.avatar).toBe("🦊");
    expect(reloaded.kids[0]?.level).toBe("teen");
    expect(reloaded.kids[1]?.name).toBe("Big one"); // the other kid is untouched
  });

  it("adds and deletes a score", async () => {
    const repo = createLocalRepository(createFakeStorage(), countingIds());
    await repo.loadFamily();

    await repo.addSession(session());
    expect((await repo.loadFamily()).sessions).toHaveLength(1);

    await repo.deleteSession("s1");
    expect((await repo.loadFamily()).sessions).toEqual([]);
  });

  it("saves nothing for a guest", async () => {
    const repo = createLocalRepository(createFakeStorage(), countingIds());
    await repo.loadFamily();

    await repo.addSession(session({ id: "g1", kidId: GUEST_KID.id }));

    expect((await repo.loadFamily()).sessions).toEqual([]);
  });

  it("remembers who played last", async () => {
    const repo = createLocalRepository(createFakeStorage(), countingIds());
    await repo.loadFamily();

    await repo.setLastKid("id-3");
    expect((await repo.loadFamily()).lastKidId).toBe("id-3");

    await repo.setLastKid(null);
    expect((await repo.loadFamily()).lastKidId).toBeNull();
  });

  it("starts fresh if the saved data is broken", async () => {
    const storage = createFakeStorage({ [STORAGE_KEY]: "{not json" });
    const data = await createLocalRepository(storage, countingIds()).loadFamily();

    expect(data.kids).toHaveLength(2);
    expect(data.family.id).toBe("id-1");
  });
});
