import type { KeyValueStorage } from "./localRepository";

/**
 * Test helper: localStorage kept in memory. It fits KeyValueStorage just by
 * having the right methods - no "implements" needed (structural typing).
 */
export function createFakeStorage(initial?: Record<string, string>): KeyValueStorage {
  const items = new Map<string, string>(Object.entries(initial ?? {}));
  return {
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => {
      items.set(key, value);
    },
  };
}
