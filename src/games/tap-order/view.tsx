import { useCallback } from "react";
import type { GameProgress } from "../../core/game";
import { newId } from "../../core/ids";
import { PlayShell } from "../../play/PlayShell";
import type { GameViewProps } from "../../play/types";
import { useGameRunner } from "../../play/useGameRunner";
import { GRID_SIZE, numbersVisible, tapOrder } from "./logic";

export function TapOrderView({ kid, onFinish, onQuit }: GameViewProps) {
  const handleFinish = useCallback(
    (progress: GameProgress, durationMs: number) => {
      onFinish({
        id: newId(),
        gameId: tapOrder.meta.id,
        score: progress.score,
        detail: progress.detail,
        durationMs,
      });
    },
    [onFinish],
  );

  const runner = useGameRunner(tapOrder, kid.level, handleFinish);
  if (!runner) return null;
  const { state, progress, answer, answerCount } = runner;

  const visible = numbersVisible(state);

  return (
    <PlayShell
      meta={tapOrder.meta}
      progress={progress}
      totalMs={tapOrder.levels[kid.level].seconds * 1000}
      flash={state.lastAnswer}
      flashToken={answerCount}
      onQuit={onQuit}
      board={
        <div className="center">
          <div className="grid" style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)` }}>
            {state.board.map((value, index) => (
              <button
                key={index}
                type="button"
                className={value === null ? "cell number empty" : "cell number"}
                aria-label={value === null ? "Empty square" : `Number ${value}`}
                onClick={() => answer(index)}
              >
                {value !== null && visible ? value : ""}
              </button>
            ))}
          </div>
          <p className="sub" style={{ margin: 0 }}>
            Next: <b>{state.nextNumber}</b>
            {!visible && " · the numbers are hidden now"}
          </p>
        </div>
      }
    />
  );
}
