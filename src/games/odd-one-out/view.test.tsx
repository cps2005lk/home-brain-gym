// @vitest-environment jsdom
/**
 * Component tests for the Odd One Out screen. The runner reads
 * performance.now() and uses requestAnimationFrame, so the fake timers fake
 * those too, and time only moves with vi.advanceTimersByTime, in small steps.
 */
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Kid } from "../../data/types";
import { oddOneOut, type OddOneOutState } from "./logic";
import { OddOneOutView } from "./view";

const KID: Kid = {
  id: "00000000-0000-4000-8000-000000000002",
  familyId: "00000000-0000-4000-8000-000000000001",
  name: "Test kid",
  level: "junior",
  avatar: "🐢",
  color: "sun",
  dailyLimitMinutes: 10,
};

/** Move the fake clock in small steps, so React can redraw between frames. */
async function advance(totalMs: number, stepMs = 50): Promise<void> {
  for (let passed = 0; passed < totalMs; passed += stepMs) {
    await act(async () => {
      vi.advanceTimersByTime(stepMs);
    });
  }
}

const shapeButtons = (): HTMLElement[] => screen.getAllByRole("button", { name: /^Shape \d+$/ });

const counted = (state: OddOneOutState): number => state.correct + state.mistakes;

describe("Odd One Out screen", () => {
  beforeEach(() => {
    vi.useFakeTimers({
      toFake: [
        "setTimeout",
        "clearTimeout",
        "setInterval",
        "clearInterval",
        "requestAnimationFrame",
        "cancelAnimationFrame",
        "performance",
        "Date",
      ],
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  const renderJunior = () =>
    render(<OddOneOutView kid={KID} onFinish={vi.fn()} onQuit={vi.fn()} />);

  it("draws 6 shapes in 3 columns, exactly one drawn differently", () => {
    const { container } = renderJunior();

    const buttons = shapeButtons();
    expect(buttons.map((button) => button.getAttribute("aria-label"))).toEqual([
      "Shape 1",
      "Shape 2",
      "Shape 3",
      "Shape 4",
      "Shape 5",
      "Shape 6",
    ]);

    const grid = container.querySelector<HTMLElement>(".grid");
    expect(grid).not.toBeNull();
    expect(grid?.style.gridTemplateColumns).toBe("repeat(3, 1fr)");
    for (const button of buttons) expect(grid?.contains(button)).toBe(true);

    const drawings = buttons.map((button) => button.innerHTML);
    const differs = drawings.filter(
      (drawing) => drawings.filter((other) => other === drawing).length === 1,
    );
    expect(differs).toHaveLength(1);
  });

  it("sends the index of the tapped shape and flashes", async () => {
    const reduce = vi.spyOn(oddOneOut, "reduce");
    const { container } = renderJunior();
    await advance(400);

    fireEvent.click(screen.getByRole("button", { name: "Shape 5" }));

    const callIndex = reduce.mock.calls.findIndex(([, event]) => event.kind === "answer");
    expect(reduce.mock.calls[callIndex]?.[1]).toMatchObject({ kind: "answer", input: 4 });
    const result = reduce.mock.results[callIndex];
    if (result?.type !== "return") throw new Error("reduce did not return");
    expect(counted(result.value)).toBe(1);
    expect(container.querySelector(".flash")).not.toBeNull();
  });

  it("does not replay the flash for a tap in the pause", async () => {
    const reduce = vi.spyOn(oddOneOut, "reduce");
    const { container } = renderJunior();
    await advance(400);

    fireEvent.click(screen.getByRole("button", { name: "Shape 5" }));
    const flashBefore = container.querySelector(".flash");
    expect(flashBefore).not.toBeNull();

    // Same moment, so this tap lands in the 300 ms pause of the new grid.
    fireEvent.click(screen.getByRole("button", { name: "Shape 2" }));

    const answers = reduce.mock.results.filter(
      (_, index) => reduce.mock.calls[index]?.[1].kind === "answer",
    );
    expect(answers).toHaveLength(2);
    const last = answers[1];
    if (last?.type !== "return") throw new Error("reduce did not return");
    expect(counted(last.value)).toBe(1);
    expect(container.querySelector(".flash")).toBe(flashBefore);
  });

  it("shows no flash for a tap in the pause of the first grid", async () => {
    const { container } = renderJunior();
    await advance(100);

    fireEvent.click(screen.getByRole("button", { name: "Shape 1" }));

    expect(container.querySelector(".flash")).toBeNull();
  });
});
