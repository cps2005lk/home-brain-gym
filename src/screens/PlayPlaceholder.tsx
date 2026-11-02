import { LEVELS } from "../core/level";
import type { Kid } from "../data/types";
import type { AnyGame } from "../games";

interface PlayPlaceholderProps {
  readonly game: AnyGame;
  readonly kid: Kid;
  readonly onBack: () => void;
}

/**
 * Temporary screen. The game logic is already written and tested; Milestone 4
 * connects it to this screen (countdown, board, timer, result).
 */
export function PlayPlaceholder({ game, kid, onBack }: PlayPlaceholderProps) {
  const level = game.levels[kid.level];

  return (
    <>
      <div className="row">
        <h1 className="grow">{game.meta.name}</h1>
        <button type="button" className="ghost" onClick={onBack}>
          Back
        </button>
      </div>

      <div className="board">
        <div>
          <p>
            {kid.name} · {LEVELS[kid.level].label}
          </p>
          <p style={{ fontWeight: 800, fontSize: "1.2rem" }}>{game.meta.how}</p>
          <p className="sub">Playing is wired up in the next step (Milestone 4).</p>
          <p className="sub">Level settings ready: {JSON.stringify(level)}</p>
        </div>
      </div>
    </>
  );
}
