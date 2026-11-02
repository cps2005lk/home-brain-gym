import { useCallback } from "react";
import { newId } from "../../core/ids";
import type { GameProgress } from "../../core/game";
import { PlayShell } from "../../play/PlayShell";
import type { GameViewProps } from "../../play/types";
import { useGameRunner } from "../../play/useGameRunner";
import { COLOR_CHOICES, colorChoices, colorClash } from "./logic";

/**
 * The screen for Color Clash. It owns no rules at all: it draws what the state
 * says and sends taps back. Every rule lives in logic.ts, where tests can see it.
 */
export function ColorClashView({ kid, onFinish, onQuit }: GameViewProps) {
  /**
   * `useCallback` keeps the same function between redraws. Without it, the
   * runner would think "the finish handler changed" on every frame.
   */
  const handleFinish = useCallback(
    (progress: GameProgress, durationMs: number) => {
      onFinish({
        id: newId(),
        gameId: colorClash.meta.id,
        score: progress.score,
        detail: progress.detail,
        durationMs,
      });
    },
    [onFinish],
  );

  const runner = useGameRunner(colorClash, kid.level, handleFinish);
  // The first draw happens before the game is built, so there is nothing yet.
  if (!runner) return null;
  const { state, progress, answer, answerCount } = runner;

  const word = COLOR_CHOICES[state.prompt.wordIndex];
  const ink = COLOR_CHOICES[state.prompt.inkIndex];
  if (!word || !ink) return null;

  return (
    <PlayShell
      meta={colorClash.meta}
      progress={progress}
      totalMs={colorClash.levels[kid.level].seconds * 1000}
      flash={state.lastAnswer}
      flashToken={answerCount}
      onQuit={onQuit}
      board={
        <div className="big" style={{ color: ink.token }}>
          {word.word}
        </div>
      }
      answers={colorChoices(kid.level).map((choice, index) => (
        <button
          key={choice.word}
          type="button"
          className="ans"
          onClick={() => answer(index)}
          aria-label={choice.word}
        >
          <span className="dot" style={{ background: choice.token }} />
          {choice.word}
        </button>
      ))}
    />
  );
}
