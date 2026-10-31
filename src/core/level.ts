/**
 * The two difficulty levels of the app.
 *
 * `as const` freezes this array, so TypeScript knows the exact strings,
 * not just "some strings".
 */
export const LEVEL_IDS = ["junior", "teen"] as const;

/**
 * A *union type*: a LevelId can only ever be "junior" or "teen".
 * This is what we use instead of a C# enum. Why it is nicer here:
 * - it is just a string at runtime, so it saves and reads from JSON with no mapping
 * - a typo like "Junior" is a compile error, same as a wrong enum member in C#
 */
export type LevelId = (typeof LEVEL_IDS)[number];

export interface LevelInfo {
  readonly id: LevelId;
  readonly label: string;
}

/**
 * `Record<LevelId, LevelInfo>` is like Dictionary<LevelId, LevelInfo> in C#,
 * but stricter: the compiler forces every level to have exactly one entry.
 * Forget "teen" here and the build fails.
 */
export const LEVELS: Record<LevelId, LevelInfo> = {
  junior: { id: "junior", label: "Junior (age 6-9)" },
  teen: { id: "teen", label: "Teen (age 10+)" },
};
