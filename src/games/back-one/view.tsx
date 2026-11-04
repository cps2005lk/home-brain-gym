import { useCallback } from "react";
import type { GameProgress } from "../../core/game";
import { newId } from "../../core/ids";
import { PlayShell } from "../../play/PlayShell";
import type { GameViewProps } from "../../play/types";
import { useGameRunner } from "../../play/useGameRunner";
import { backOne, SYMBOLS } from "./logic";

export function BackOneView({ kid, onFinish, onQuit }: GameViewProps) {
  const handleFinish = useCallback(
    (progress: GameProgress, durationMs: number) => {
      onFinish({
        id: newId(),
        gameId: backOne.meta.id,
        score: progress.score,
        detail: progress.detail,
        durationMs,
      });
    },
    [onFinish],
  );

  const runner = useGameRunner(backOne, kid.level, handleFinish);
  if (!runner) return null;
  const { state, progress, answer, answerCount } = runner;

  const level = backOne.levels[kid.level];
  const current = state.shown[state.shown.length - 1];
  const symbol = current === undefined ? "" : (SYMBOLS[current] ?? "");

  /** A thin bar that empties as this picture's time runs out. */
  const stepLeft = Math.max(0, state.stepEndsAtMs - state.nowMs) / level.stepMs;

  return (
    <PlayShell
      meta={backOne.meta}
      progress={progress}
      totalMs={level.seconds * 1000}
      flash={state.lastAnswer}
      flashToken={answerCount + state.shown.length}
      onQuit={onQuit}
      board={
        <div className="center">
          {/* A new key on every picture restarts the pop animation. */}
          <div key={state.shown.length} className="symbol">
            {symbol}
          </div>
          <div className="steptimer">
            <i style={{ width: `${stepLeft * 100}%` }} />
          </div>
          <p className="sub" style={{ margin: 0 }}>
            {level.backBy === 1 ? "Same as the picture before?" : "Same as TWO pictures before?"}
          </p>
        </div>
      }
      answers={
        <button
          type="button"
          className="ans"
          style={{ gridColumn: "1 / -1" }}
          onClick={() => answer("same")}
          disabled={state.answeredThisStep}
        >
          SAME
        </button>
      }
    />
  );
}
