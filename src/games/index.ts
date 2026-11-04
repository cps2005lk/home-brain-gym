import { arrowRush } from "./arrow-rush/logic";
import { backOne } from "./back-one/logic";
import { colorClash } from "./color-clash/logic";
import { patternMemory } from "./pattern-memory/logic";
import { quickAdd } from "./quick-add/logic";
import { ruleSwitch } from "./rule-switch/logic";

/**
 * The game registry. Adding a new game = add its folder, then add one import
 * and one entry here. Nothing else in the app needs to change.
 *
 * `as const` keeps the exact list, so TypeScript knows each game's own state
 * and input types - not just "some game". The home screen only reads `.meta`,
 * which every game has.
 */
export const GAMES = [colorClash, patternMemory, ruleSwitch, arrowRush, quickAdd, backOne] as const;

export type AnyGame = (typeof GAMES)[number];

/** Look a game up by the id stored with a score row. */
export function findGame(id: string): AnyGame | undefined {
  return GAMES.find((game) => game.meta.id === id);
}
