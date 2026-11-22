import { describe, expect, it } from "vitest";
import {
  NEW_GRID_PAUSE_MS,
  ODD_ONE_OUT_LEVELS,
  SHAPE_KINDS,
  SYMMETRY_DEG,
  sameShape,
  type Shape,
} from "./logic";

describe("Odd One Out levels", () => {
  it("gives Junior 45 seconds and a 2x3 grid with an obvious difference", () => {
    expect(ODD_ONE_OUT_LEVELS.junior).toEqual({
      seconds: 45,
      rows: 2,
      cols: 3,
      subtle: false,
      biggerScale: 1.2,
      smallerScale: 0.82,
      turnDeg: 20,
    });
  });

  it("gives Teen 30 seconds and a 4x4 grid with a subtle difference", () => {
    expect(ODD_ONE_OUT_LEVELS.teen).toEqual({
      seconds: 30,
      rows: 4,
      cols: 4,
      subtle: true,
      biggerScale: 1.2,
      smallerScale: 0.82,
      turnDeg: 20,
    });
  });
});

describe("Odd One Out shapes", () => {
  it("lists the five shape kinds in roll order", () => {
    expect(SHAPE_KINDS).toEqual(["circle", "square", "triangle", "star", "heart"]);
  });

  it("knows the turn that maps each kind onto itself", () => {
    expect(SYMMETRY_DEG).toEqual({ circle: 0, square: 90, triangle: 120, star: 72, heart: 360 });
  });

  it("ignores taps for 300 ms after a new grid", () => {
    expect(NEW_GRID_PAUSE_MS).toBe(300);
  });
});

describe("sameShape", () => {
  const base: Shape = { kind: "square", scale: 1, turnDeg: 0, dot: true };

  it("is true when all four fields match", () => {
    expect(sameShape(base, { ...base })).toBe(true);
  });

  it("is false when the kind differs", () => {
    expect(sameShape(base, { ...base, kind: "circle" })).toBe(false);
  });

  it("is false when the scale differs", () => {
    expect(sameShape(base, { ...base, scale: 1.2 })).toBe(false);
  });

  it("is false when the turn differs", () => {
    expect(sameShape(base, { ...base, turnDeg: 20 })).toBe(false);
  });

  it("is false when the dot differs", () => {
    expect(sameShape(base, { ...base, dot: false })).toBe(false);
  });
});
