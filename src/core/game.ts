import type { LevelId } from "./level";
import type { Rng } from "./random";

/** The skill a game trains. Another union type instead of an enum. */
export type SkillTag = "focus" | "memory" | "flexibility" | "attention" | "numbers" | "speed";

/** The text and look of a game. Everything the home screen needs to draw a tile. */
export interface GameMeta {
  readonly id: string;
  readonly name: string;
  readonly skill: SkillTag;
  readonly skillLabel: string;
  /** One short line telling the kid what to do. */
  readonly how: string;
  /** Small symbol shown in the coloured square on the tile. */
  readonly glyph: string;
  /** CSS colour token, for example "var(--red)". */
  readonly accent: string;
  /** What the score counts, for more than one: "correct", "squares", "points". */
  readonly scoreUnit: string;
  /** The same word for exactly one: "correct", "square", "point". */
  readonly scoreUnitOne: string;
  /** true = the game ends when the clock runs out, false = it ends when lives run out. */
  readonly timed: boolean;
}

/**
 * Everything that can happen during a game.
 *
 * This is a *discriminated union*: the `kind` field tells TypeScript which
 * shape you have. Inside `if (event.kind === "answer")` the compiler knows
 * `event.input` exists. It is like pattern matching on a C# record hierarchy,
 * and `switch` on `kind` must cover every case or the build complains.
 *
 * `atMs` is the current time in milliseconds, passed in from outside. The game
 * logic never calls Date.now() itself, so tests can pretend any time they like.
 */
export type GameEvent<TInput> =
  | { readonly kind: "answer"; readonly input: TInput; readonly atMs: number }
  | { readonly kind: "tick"; readonly atMs: number };

/**
 * What the play screen shows while a game runs, and again on the result screen.
 * `null` means "this game does not have that": Pattern Memory has no clock,
 * the other three have no lives.
 */
export interface GameProgress {
  readonly score: number;
  /** Extra line for the result screen, for example "3 mistakes". */
  readonly detail: string;
  readonly timeLeftMs: number | null;
  readonly livesLeft: number | null;
}

/**
 * The contract every game must follow. Adding a new game = writing one new file
 * that exports one of these. Nothing else in the app changes.
 *
 * The three type parameters are *generics*, like `class Game<TState>` in C#:
 * - TState       the game's own memory (its score, its current question...)
 * - TInput       what a kid can answer with (a colour index, "left" | "right", ...)
 * - TLevelConfig the per-level settings (seconds, grid size, number of colours)
 *
 * Every method is *pure*: it gets state in and returns new state out, and never
 * touches the screen, the clock or storage. That is what makes it easy to test.
 */
export interface GameModule<TState, TInput, TLevelConfig> {
  readonly meta: GameMeta;

  /** Settings for each level. The compiler forces both junior and teen to exist. */
  readonly levels: Readonly<Record<LevelId, TLevelConfig>>;

  /** Build the starting state for one play. */
  create(level: LevelId, rng: Rng, startedAtMs: number): TState;

  /** Take the old state and one event, return the new state. Never change the old one. */
  reduce(state: TState, event: GameEvent<TInput>, rng: Rng): TState;

  /** Has this play finished? */
  isOver(state: TState): boolean;

  /** Score and pills to show. Valid during the game and after it ends. */
  progress(state: TState): GameProgress;
}

/**
 * A small helper used when writing a game file.
 *
 * It returns exactly what you give it, but because it is generic, TypeScript
 * *infers* TState, TInput and TLevelConfig from your object. You get full
 * checking inside create() and reduce() without writing the types twice.
 * Same idea as a generic factory method in C# letting you skip <T>.
 */
/** "1 point" but "3 points". Kids notice this kind of thing. */
export function scoreUnitLabel(count: number, meta: GameMeta): string {
  return count === 1 ? meta.scoreUnitOne : meta.scoreUnit;
}

export function defineGame<TState, TInput, TLevelConfig>(
  game: GameModule<TState, TInput, TLevelConfig>,
): GameModule<TState, TInput, TLevelConfig> {
  return game;
}
