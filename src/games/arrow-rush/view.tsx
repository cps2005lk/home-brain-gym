import { useCallback } from "react";
import { newId } from "../../core/ids";
import type { GameProgress } from "../../core/game";
import { PlayShell } from "../../play/PlayShell";
import type { GameViewProps } from "../../play/types";
import { useGameRunner } from "../../play/useGameRunner";
import { arrowRush, arrowsFor, middleIndex } from "./logic";

export function ArrowRushView({ kid, onFinish, onQuit }: GameViewProps) {
  const handleFinish = useCallback(
    (progress: GameProgress, durationMs: number) => {
      onFinish({
        id: newId(),
        gameId: arrowRush.meta.id,
        score: progress.score,
        detail: progress.detail,
        durationMs,
      });
    },
    [onFinish],
  );

  const runner = useGameRunner(arrowRush, kid.level, handleFinish);
  if (!runner) return null;
  const { state, progress, answer, answerCount } = runner;

  const level = arrowRush.levels[kid.level];
  const arrows = arrowsFor(state.round, level.arrowCount);
  const middle = middleIndex(level.arrowCount);

  return (
    <PlayShell
      meta={arrowRush.meta}
      progress={progress}
      totalMs={level.seconds * 1000}
      flash={state.lastAnswer}
      flashToken={answerCount}
      onQuit={onQuit}
      board={
        <div className="arrows" aria-label="Arrows">
          {arrows.map((direction, index) => (
            <span
              key={index}
              style={
                index === middle && level.highlightMiddle ? { color: "var(--yellow)" } : undefined
              }
            >
              {direction === "left" ? "←" : "→"}
            </span>
          ))}
        </div>
      }
      answers={
        <>
          <button type="button" className="ans" onClick={() => answer("left")} aria-label="Left">
            ← Left
          </button>
          <button type="button" className="ans" onClick={() => answer("right")} aria-label="Right">
            Right →
          </button>
        </>
      }
    />
  );
}
