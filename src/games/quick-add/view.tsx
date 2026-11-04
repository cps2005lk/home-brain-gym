import { useCallback } from "react";
import type { GameProgress } from "../../core/game";
import { newId } from "../../core/ids";
import { PlayShell } from "../../play/PlayShell";
import type { GameViewProps } from "../../play/types";
import { useGameRunner } from "../../play/useGameRunner";
import { quickAdd } from "./logic";

export function QuickAddView({ kid, onFinish, onQuit }: GameViewProps) {
  const handleFinish = useCallback(
    (progress: GameProgress, durationMs: number) => {
      onFinish({
        id: newId(),
        gameId: quickAdd.meta.id,
        score: progress.score,
        detail: progress.detail,
        durationMs,
      });
    },
    [onFinish],
  );

  const runner = useGameRunner(quickAdd, kid.level, handleFinish);
  if (!runner) return null;
  const { state, progress, answer, answerCount } = runner;
  const { question } = state;

  return (
    <PlayShell
      meta={quickAdd.meta}
      progress={progress}
      totalMs={quickAdd.levels[kid.level].seconds * 1000}
      flash={state.lastAnswer}
      flashToken={answerCount}
      onQuit={onQuit}
      board={
        <div className="big sum">
          {question.left} {question.minus ? "−" : "+"} {question.right}
        </div>
      }
      answers={question.choices.map((choice, index) => (
        <button
          key={`${choice}-${index}`}
          type="button"
          className="ans"
          onClick={() => answer(index)}
        >
          {choice}
        </button>
      ))}
    />
  );
}
