import { useCallback } from "react";
import { newId } from "../../core/ids";
import type { GameProgress } from "../../core/game";
import { PlayShell } from "../../play/PlayShell";
import type { GameViewProps } from "../../play/types";
import { useGameRunner } from "../../play/useGameRunner";
import { litCells, patternMemory } from "./logic";

export function PatternMemoryView({ kid, onFinish, onQuit }: GameViewProps) {
  const handleFinish = useCallback(
    (progress: GameProgress, durationMs: number) => {
      onFinish({
        id: newId(),
        gameId: patternMemory.meta.id,
        score: progress.score,
        detail: progress.detail,
        durationMs,
      });
    },
    [onFinish],
  );

  const runner = useGameRunner(patternMemory, kid.level, handleFinish);
  if (!runner) return null;
  const { state, progress, answer, answerCount } = runner;

  /**
   * The lights come straight from the logic we already tested. The view asks
   * "what should be lit at this moment?" on every frame and draws the answer.
   */
  const lit = litCells(state, state.nowMs);
  const cellCount = state.gridSize * state.gridSize;

  const classFor = (index: number): string => {
    if (state.wrongCell === index) return "cell miss";
    if (state.hits.includes(index)) return "cell hit";
    if (lit.includes(index)) return "cell lit";
    return "cell";
  };

  return (
    <PlayShell
      meta={patternMemory.meta}
      progress={progress}
      totalMs={null}
      flash={state.phase.kind === "won" ? "right" : state.phase.kind === "lost" ? "wrong" : null}
      flashToken={answerCount}
      onQuit={onQuit}
      board={
        <div className="grid" style={{ gridTemplateColumns: `repeat(${state.gridSize}, 1fr)` }}>
          {Array.from({ length: cellCount }, (_, index) => (
            <button
              key={index}
              type="button"
              className={classFor(index)}
              aria-label={`Square ${index + 1}`}
              onClick={() => answer(index)}
            />
          ))}
        </div>
      }
      answers={
        <p className="howto" style={{ gridColumn: "1 / -1" }}>
          {state.ordered ? "Tap them in the same order they lit up." : "Any order is fine."}
        </p>
      }
    />
  );
}
