import { badgeById, type BadgeId } from "../data/streaks";
import type { FinishedPlay } from "./types";

interface ResultScreenProps {
  readonly play: FinishedPlay;
  readonly gameName: string;
  readonly scoreUnit: string;
  readonly kidName: string;
  /** The kid's best score BEFORE this play. */
  readonly previousBest: number;
  readonly wasSaved: boolean;
  /** Badges earned by this very game, if any. */
  readonly newBadges: readonly BadgeId[];
  /** False once the daily limit is reached: this game still counted, but no more today. */
  readonly canPlayAgain: boolean;
  readonly onPlayAgain: () => void;
  readonly onHome: () => void;
}

/** Always compares the kid with their own best. Never with a brother or sister. */
function message(score: number, previousBest: number): string {
  if (previousBest === 0) return "First score saved. Now try to beat it tomorrow.";
  if (score > previousBest) return "New personal best! 🎉";
  if (score === previousBest) return "Same as your best. So close!";
  return `${previousBest - score} more to beat your best (${previousBest}).`;
}

export function ResultScreen({
  play,
  gameName,
  scoreUnit,
  kidName,
  previousBest,
  wasSaved,
  newBadges,
  canPlayAgain,
  onPlayAgain,
  onHome,
}: ResultScreenProps) {
  return (
    <div className="board result">
      <div className="center">
        <p style={{ opacity: 0.8 }}>
          {kidName} · {gameName}
        </p>
        <div className="score">{play.score}</div>
        <p>
          {scoreUnit}
          {play.detail ? ` · ${play.detail}` : ""}
        </p>
        <p style={{ fontWeight: 800, fontSize: "1.15rem" }}>{message(play.score, previousBest)}</p>
        {newBadges.length > 0 && (
          <div className="new-badges">
            {newBadges.map((id) => {
              const badge = badgeById(id);
              return badge ? (
                <span key={id} className="new-badge">
                  {badge.emoji} {badge.name}
                </span>
              ) : null;
            })}
          </div>
        )}

        {!wasSaved && <p className="sub">Guest game - this score is not saved.</p>}
        {!canPlayAgain && <p className="sub">⏱ Time is up for today. See you tomorrow!</p>}

        <div className="btnrow">
          <button
            type="button"
            className="play"
            style={{ padding: "12px 22px" }}
            onClick={onPlayAgain}
            disabled={!canPlayAgain}
          >
            Play again
          </button>
          <button
            type="button"
            className="ghost"
            style={{ color: "var(--board-ink)" }}
            onClick={onHome}
          >
            All games
          </button>
        </div>
      </div>
    </div>
  );
}
