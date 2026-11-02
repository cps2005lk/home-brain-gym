import { LEVELS } from "../core/level";
import { statsFor } from "../data/stats";
import { KID_COLOR_TOKENS, type GameSession, type Kid } from "../data/types";
import { GAMES } from "../games";
import { GameTile } from "../components/GameTile";

interface HomeScreenProps {
  readonly kid: Kid;
  readonly sessions: readonly GameSession[];
  readonly onPlay: (gameId: string) => void;
  readonly onSwitchKid: () => void;
}

export function HomeScreen({ kid, sessions, onPlay, onSwitchKid }: HomeScreenProps) {
  return (
    <>
      <div className="row">
        <div className="avatar small" style={{ background: KID_COLOR_TOKENS[kid.color] }}>
          {kid.avatar}
        </div>
        <div className="grow">
          <div className="kid-name">{kid.name}</div>
          <div className="kid-meta">{LEVELS[kid.level].label}</div>
        </div>
        <button type="button" className="ghost" onClick={onSwitchKid}>
          Switch kid
        </button>
      </div>

      <div>
        <h1>
          Home <span>Brain Gym</span>
        </h1>
        <p className="sub">Beat your own best score. Nobody else's.</p>
      </div>

      {/* GAMES comes from the registry, so a new game appears here by itself. */}
      <div className="games">
        {GAMES.map((game) => (
          <GameTile
            key={game.meta.id}
            meta={game.meta}
            stats={statsFor(sessions, kid.id, game.meta.id)}
            onPlay={() => onPlay(game.meta.id)}
          />
        ))}
      </div>

      <div className="tip">
        <b>The 10-minute plan</b>
        <ol>
          <li>Same time every day (after dinner works well).</li>
          <li>Play 3 games, about 1 minute each. Rotate the 4th game.</li>
          <li>Compare only with your own last score, never with your brother or sister.</li>
          <li>Stop while it is still fun.</li>
        </ol>
      </div>
    </>
  );
}
