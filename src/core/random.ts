/**
 * Every game asks for random numbers through this small interface,
 * never from Math.random() directly.
 *
 * Why: in a test we pass a fake Rng that returns numbers we choose, so the
 * same test gives the same result every time. This is the same idea as
 * injecting an interface instead of calling DateTime.Now in C#.
 *
 * The real implementations arrive in Milestone 2.
 */
export interface Rng {
  /** A whole number from 0 up to (but not including) maxExclusive. */
  nextInt(maxExclusive: number): number;
}
