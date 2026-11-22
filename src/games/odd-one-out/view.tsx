import { useCallback } from "react";
import type { GameProgress } from "../../core/game";
import { newId } from "../../core/ids";
import { PlayShell } from "../../play/PlayShell";
import type { GameViewProps } from "../../play/types";
import { useGameRunner } from "../../play/useGameRunner";
import { oddOneOut, type Shape, type ShapeKind } from "./logic";

/**
 * Every kind fits inside a circle of radius 40 around the centre (50, 50) of a
 * 100 x 100 box. At the bigger scale (1.2) that is radius 48, turned or not,
 * so a bigger shape is never cut off at the edge (FR-016).
 */
function KindPath({ kind }: { readonly kind: ShapeKind }) {
  switch (kind) {
    case "circle":
      return <circle cx="50" cy="50" r="36" />;
    case "square":
      return <rect x="24" y="24" width="52" height="52" />;
    case "triangle":
      return <polygon points="50,10 84.6,70 15.4,70" />;
    case "star":
      return (
        <polygon points="50,10 59.4,37.1 88,37.6 65.2,54.9 73.5,82.4 50,66 26.5,82.4 34.8,54.9 12,37.6 40.6,37.1" />
      );
    case "heart":
      return (
        <path d="M50 84 C20 64 14 44 22 30 C30 16 46 18 50 32 C54 18 70 16 78 30 C86 44 80 64 50 84 Z" />
      );
  }
}

/**
 * One shape, in one colour for the whole grid (FR-006): `currentColor` from the
 * CSS. Size and turn are a transform around the centre (50, 50). The centre dot
 * takes the light cell colour, so it shows as a light spot on every kind: the
 * difference is size, turn or a missing spot, never a colour.
 */
function ShapeDrawing({ shape }: { readonly shape: Shape }) {
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true" fill="currentColor">
      <g
        transform={`translate(50 50) rotate(${shape.turnDeg}) scale(${shape.scale}) translate(-50 -50)`}
      >
        <KindPath kind={shape.kind} />
        {shape.dot && <circle cx="50" cy="50" r="6" style={{ fill: "var(--board-ink)" }} />}
      </g>
    </svg>
  );
}

export function OddOneOutView({ kid, onFinish, onQuit }: GameViewProps) {
  const handleFinish = useCallback(
    (progress: GameProgress, durationMs: number) => {
      onFinish({
        id: newId(),
        gameId: oddOneOut.meta.id,
        score: progress.score,
        detail: progress.detail,
        durationMs,
      });
    },
    [onFinish],
  );

  const runner = useGameRunner(oddOneOut, kid.level, handleFinish);
  if (!runner) return null;
  const { state, progress, answer } = runner;

  const level = oddOneOut.levels[kid.level];

  return (
    <PlayShell
      meta={oddOneOut.meta}
      progress={progress}
      totalMs={level.seconds * 1000}
      flash={state.lastAnswer}
      // Not answerCount: that grows on every tap, even one the rules ignore
      // (the pause), which would replay the last flash (research R5).
      flashToken={state.correct + state.mistakes}
      onQuit={onQuit}
      board={
        <div className="center">
          <div className="grid" style={{ gridTemplateColumns: `repeat(${level.cols}, 1fr)` }}>
            {state.grid.shapes.map((shape, index) => (
              <button
                key={index}
                type="button"
                className="cell shape"
                aria-label={`Shape ${index + 1}`}
                onClick={() => answer(index)}
              >
                <ShapeDrawing shape={shape} />
              </button>
            ))}
          </div>
        </div>
      }
    />
  );
}
