// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { STORAGE_KEY } from "./data/localRepository";
import type { FamilyData } from "./data/types";

// Keep the test on this device only, even when .env.local has Supabase
// settings (Vite loads .env.local for tests too).
vi.mock("./data/supabaseClient", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./data/supabaseClient")>()),
  isSupabaseConfigured: false,
  getSupabase: () => Promise.resolve(null),
}));

const FAMILY_ID = "00000000-0000-4000-8000-000000000001";
const KID_ID = "00000000-0000-4000-8000-000000000002";

/** Colombo is UTC+05:30, so 23:30 in Colombo is 18:00 UTC. */
const TEN_MINUTES_PLAYED_AT_2330_COLOMBO: FamilyData = {
  version: 1,
  family: { id: FAMILY_ID, name: "Test family" },
  kids: [
    {
      id: KID_ID,
      familyId: FAMILY_ID,
      name: "Test kid",
      level: "junior",
      avatar: "🐢",
      color: "sun",
      dailyLimitMinutes: 10,
    },
  ],
  sessions: [
    {
      id: "00000000-0000-4000-8000-000000000003",
      kidId: KID_ID,
      gameId: "quick-add",
      level: "junior",
      score: 7,
      detail: "",
      playedAt: "2026-11-15T18:00:00.000Z",
      durationMs: 10 * 60_000,
    },
  ],
  lastKidId: KID_ID,
};

/** Let the app's promises (loading the saved data) finish. */
async function settle(): Promise<void> {
  await act(async () => {});
}

describe("daily limit across midnight (Asia/Colombo)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-15T18:20:00.000Z")); // 23:50 in Colombo
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(TEN_MINUTES_PLAYED_AT_2330_COLOMBO));
  });

  afterEach(() => {
    cleanup();
    window.localStorage.clear();
    vi.useRealTimers();
  });

  it("gives the kid a fresh limit after midnight, without reloading the page", async () => {
    // Arrange: 23:50, and the kid has used all 10 minutes today.
    render(<App pendingInvite={null} />);
    await settle();
    expect(screen.getByText(/Time is up for today/)).toBeTruthy();

    // Act: the page stays open while the clock passes midnight (00:10).
    await act(async () => {
      vi.advanceTimersByTime(20 * 60_000);
    });

    // Assert: it is a new day, so the full limit is back.
    expect(screen.getByText(/10 min left today/)).toBeTruthy();
  });
});
