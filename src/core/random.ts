/**
 * Every game asks for random numbers through this small interface,
 * never from Math.random() directly.
 *
 * Why: in a test we pass a fake Rng that returns numbers we choose, so the
 * same test gives the same result every time. This is the same idea as
 * injecting an interface instead of calling DateTime.Now in C#.
 */
export interface Rng {
  /** A whole number from 0 up to (but not including) maxExclusive. */
  nextInt(maxExclusive: number): number;
}

/** The real one, used when a kid plays. */
export function createRng(): Rng {
  return {
    nextInt: (maxExclusive) => (maxExclusive <= 0 ? 0 : Math.floor(Math.random() * maxExclusive)),
  };
}

/**
 * A repeatable Rng. The same seed always gives the same sequence of numbers,
 * which is what we want in tests ("mulberry32", a well known small algorithm).
 *
 * Note `let state` lives inside the function and is captured by nextInt. That
 * is a *closure*: the variable stays alive and private, like a private field
 * in a C# class. Nobody outside can reach or change it.
 */
export function createSeededRng(seed: number): Rng {
  let state = seed >>> 0;
  return {
    nextInt(maxExclusive) {
      if (maxExclusive <= 0) return 0;
      state = (state + 0x6d2b79f5) >>> 0;
      let t = state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      const unit = ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
      return Math.floor(unit * maxExclusive);
    },
  };
}
