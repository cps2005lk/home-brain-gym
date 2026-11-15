// @vitest-environment jsdom
/**
 * Records a product decision (docs/brain/decisions/0004-stop-discards-the-game.md):
 * Stop leaves the game without saving it. If this test fails, the decision
 * changed - update the ADR, not just the test.
 */
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Kid } from "../data/types";
import { GAMES } from "../games";
import { PlayScreen } from "./PlayScreen";

const KID: Kid = {
  id: "00000000-0000-4000-8000-000000000002",
  familyId: "00000000-0000-4000-8000-000000000001",
  name: "Test kid",
  level: "junior",
  avatar: "🐢",
  color: "sun",
  dailyLimitMinutes: 10,
};

describe("Stop during a game", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("goes home without saving the game", async () => {
    const game = GAMES.find((item) => item.meta.id === "color-clash");
    if (!game) throw new Error("color-clash game is missing");
    const onSave = vi.fn();
    const onHome = vi.fn();

    render(
      <PlayScreen
        game={game}
        kid={KID}
        previousBest={0}
        sessions={[]}
        nowIso="2026-11-16T04:00:00.000Z"
        canPlayAgain
        onSave={onSave}
        onHome={onHome}
      />,
    );
    // Past the 3-2-1 countdown. Each tick starts the next timer only after
    // React redraws, so move the clock in small steps, not one big jump.
    for (let tick = 0; tick < 5; tick += 1) {
      await act(async () => {
        vi.advanceTimersByTime(800);
      });
    }

    fireEvent.click(screen.getByText("Stop"));

    expect(onHome).toHaveBeenCalledTimes(1);
    expect(onSave).not.toHaveBeenCalled();
  });
});
