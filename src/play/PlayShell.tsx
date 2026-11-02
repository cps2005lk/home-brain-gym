import type { ReactNode } from "react";
import type { GameMeta, GameProgress } from "../core/game";

interface PlayShellProps {
  readonly meta: GameMeta;
  readonly progress: GameProgress;
  /** Full length of the clock, for the shrinking bar. null for games with no clock. */
  readonly totalMs: number | null;
  /** "right" or "wrong" for the last answer, or null before the first one. */
  readonly flash: "right" | "wrong" | null;
  /** Changes on every answer, so the same result can flash again. */
  readonly flashToken: number;
  readonly onQuit: () => void;
  readonly board: ReactNode;
  readonly answers?: ReactNode;
}

/** The frame every game plays inside: pills, clock bar, board, answer buttons. */
export function PlayShell({
  meta,
  progress,
  totalMs,
  flash,
  flashToken,
  onQuit,
  board,
  answers,
}: PlayShellProps) {
  const secondsLeft = progress.timeLeftMs === null ? null : Math.ceil(progress.timeLeftMs / 1000);
  const barWidth =
    totalMs !== null && progress.timeLeftMs !== null ? (progress.timeLeftMs / totalMs) * 100 : 100;

  return (
    <>
      <div className="bar">
        <h2>{meta.name}</h2>
        <span className="pill">
          {progress.score} {meta.scoreUnit}
        </span>
        {secondsLeft !== null && <span className="pill">{secondsLeft}s</span>}
        {progress.livesLeft !== null && (
          <span className="pill" aria-label={`${progress.livesLeft} lives left`}>
            {"♥".repeat(progress.livesLeft) || "–"}
          </span>
        )}
        <button type="button" className="ghost" onClick={onQuit}>
          Stop
        </button>
      </div>

      {totalMs !== null && (
        <div className="timebar">
          <i style={{ width: `${barWidth}%` }} />
        </div>
      )}

      <p className="howto">{meta.how}</p>

      <div className="board">
        {/*
          The green / red ring. Giving it a new `key` on every answer makes
          React replace the element, which restarts the CSS animation. No timer
          and no extra state - the browser cleans it up by itself.
        */}
        {flash && flashToken > 0 && (
          <span key={flashToken} className={`flash ${flash}`} aria-hidden="true" />
        )}
        {board}
      </div>

      {answers && <div className="answers">{answers}</div>}
    </>
  );
}
