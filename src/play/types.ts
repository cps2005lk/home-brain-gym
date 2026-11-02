import type { Kid } from "../data/types";

/** What one finished play reports back. The screen turns this into a saved row. */
export interface FinishedPlay {
  /**
   * Made once, when the play ends. If the same play is somehow reported twice
   * (a hot reload during development, a double tap, a retry), the second save
   * replaces the first row instead of adding a new one.
   */
  readonly id: string;
  readonly gameId: string;
  readonly score: number;
  readonly detail: string;
  readonly durationMs: number;
}

/**
 * Every game's view component takes exactly these props. One shape for all
 * games, so the play screen can show any of them without knowing which.
 */
export interface GameViewProps {
  readonly kid: Kid;
  readonly onFinish: (play: FinishedPlay) => void;
  readonly onQuit: () => void;
}
