import type { GameMeta } from "../core/game";
import type { GameStats } from "../data/stats";
import { Sparkline } from "./Sparkline";

interface GameTileProps {
  readonly meta: GameMeta;
  readonly stats: GameStats;
  /** What to do when the kid taps Play. The parent screen decides. */
  readonly onPlay: () => void;
  /** True when the daily limit has been reached. */
  readonly disabled?: boolean;
}

export function GameTile({ meta, stats, onPlay, disabled = false }: GameTileProps) {
  return (
    <article className="game">
      <header>
        <div className="glyph" style={{ background: meta.accent }} aria-hidden="true">
          {meta.glyph}
        </div>
        <div>
          <h3>{meta.name}</h3>
          <div className="skill">{meta.skillLabel}</div>
        </div>
      </header>

      <p>{meta.how}</p>

      <div className="stats">
        <span>
          Best
          <br />
          <b>{stats.best > 0 ? stats.best : "–"}</b>
        </span>
        <span>
          Last
          <br />
          <b>{stats.last ?? "–"}</b>
        </span>
        <Sparkline values={stats.recent} />
      </div>

      <button type="button" className="play" onClick={onPlay} disabled={disabled}>
        Play {meta.name}
      </button>
    </article>
  );
}
