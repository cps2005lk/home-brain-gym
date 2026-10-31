import { describe, expect, it } from "vitest";

// A first tiny test, only to prove the test runner works.
// Real game-logic tests arrive in Milestone 2.
describe("tooling", () => {
  it("runs a TypeScript test", () => {
    const appName: string = "Home Brain Gym";
    expect(appName).toBe("Home Brain Gym");
  });
});
