import { describe, expect, it } from "vitest";
import { kidFromRow, kidToRow, sessionFromRow, sessionToRow } from "./mappers";
import type { Database } from "./database.types";
import type { GameSession, Kid } from "./types";

type KidRow = Database["public"]["Tables"]["kids"]["Row"];
type SessionRow = Database["public"]["Tables"]["sessions"]["Row"];

const kidRow: KidRow = {
  id: "kid-1",
  family_id: "fam-1",
  name: "Nimal",
  level: "teen",
  avatar: "🦊",
  color: "sky",
  daily_limit_minutes: 20,
  created_at: "2026-11-01T08:00:00+00:00",
};

const sessionRow: SessionRow = {
  id: "play-1",
  family_id: "fam-1",
  kid_id: "kid-1",
  game_id: "color-clash",
  level: "teen",
  score: 14,
  detail: "2 mistakes",
  played_at: "2026-11-04T18:30:00+00:00",
  duration_ms: 30_000,
};

describe("kid mapping", () => {
  it("turns a database row into a Kid", () => {
    expect(kidFromRow(kidRow)).toEqual({
      id: "kid-1",
      familyId: "fam-1",
      name: "Nimal",
      level: "teen",
      avatar: "🦊",
      color: "sky",
      dailyLimitMinutes: 20,
    });
  });

  it("falls back when a row holds an unknown avatar or colour", () => {
    const odd = kidFromRow({ ...kidRow, avatar: "🐉", color: "purple" });
    expect(odd.avatar).toBe("🐢");
    expect(odd.color).toBe("sun");
  });

  it("keeps a missing daily limit as null", () => {
    expect(kidFromRow({ ...kidRow, daily_limit_minutes: null }).dailyLimitMinutes).toBeNull();
  });

  it("goes back to snake_case for writing", () => {
    const kid: Kid = kidFromRow(kidRow);
    expect(kidToRow(kid)).toEqual({
      id: "kid-1",
      family_id: "fam-1",
      name: "Nimal",
      level: "teen",
      avatar: "🦊",
      color: "sky",
      daily_limit_minutes: 20,
    });
  });
});

describe("session mapping", () => {
  it("turns a row into a GameSession and normalises the time", () => {
    expect(sessionFromRow(sessionRow)).toEqual({
      id: "play-1",
      kidId: "kid-1",
      gameId: "color-clash",
      level: "teen",
      score: 14,
      detail: "2 mistakes",
      playedAt: "2026-11-04T18:30:00.000Z", // was +00:00
      durationMs: 30_000,
    });
  });

  it("adds the family id when writing", () => {
    const session: GameSession = sessionFromRow(sessionRow);
    expect(sessionToRow(session, "fam-1")).toMatchObject({
      id: "play-1",
      family_id: "fam-1",
      kid_id: "kid-1",
      duration_ms: 30_000,
    });
  });

  it("survives a round trip", () => {
    const session = sessionFromRow(sessionRow);
    const back = sessionToRow(session, "fam-1");
    expect(sessionFromRow({ ...sessionRow, ...back } as SessionRow)).toEqual(session);
  });
});
