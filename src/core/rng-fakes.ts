import type { Rng } from "./random";

/**
 * Test helper: an Rng that returns the numbers you list, in order.
 * It throws if a game asks for more numbers than you gave, which usually means
 * the game changed how often it rolls - a useful warning in a test.
 *
 * Note the `=== undefined` check. Because of "noUncheckedIndexedAccess" in
 * tsconfig, TypeScript types `values[i]` as `number | undefined`: an index can
 * always miss. In C# this would throw at runtime; here the compiler makes us
 * handle it first.
 */
export function scriptedRng(values: readonly number[]): Rng {
  let index = 0;
  return {
    nextInt() {
      const value = values[index];
      index += 1;
      if (value === undefined) {
        throw new Error(`scriptedRng ran out of numbers after ${values.length}`);
      }
      return value;
    },
  };
}
