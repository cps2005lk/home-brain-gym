import { useState } from "react";
import { scoreUnitLabel } from "../core/game";
import { LEVELS } from "../core/level";
import { isGuest } from "../data/defaults";
import { earnedBadges, newlyEarned, type BadgeId } from "../data/streaks";
import type { GameSession, Kid } from "../data/types";
import { GAMES, type AnyGame } from "../games";
import { GAME_VIEWS } from "../games/views";
import { Countdown } from "../play/Countdown";
import { ResultScreen } from "../play/ResultScreen";
import type { FinishedPlay } from "../play/types";
import { PlayPlaceholder } from "./PlayPlaceholder";

interface PlayScreenProps {
  readonly game: AnyGame;
  readonly kid: Kid;
  /** Best score before this play, used for the "beat your own best" message. */
  readonly previousBest: number;
  /** Everything played so far, used to see which badges this game unlocks. */
  readonly sessions: readonly GameSession[];
  readonly nowIso: string;
  readonly onSave: (play: FinishedPlay) => void;
  readonly onHome: () => void;
}

type Phase = "countdown" | "playing" | "result";

export function PlayScreen({
  game,
  kid,
  previousBest,
  sessions,
  nowIso,
  onSave,
  onHome,
}: PlayScreenProps) {
  const [phase, setPhase] = useState<Phase>("countdown");
  const [play, setPlay] = useState<FinishedPlay | null>(null);
  /** Frozen before the play starts, so the result compares with the old best. */
  const [bestBefore, setBestBefore] = useState(previousBest);
  /** Changing this number makes React build a brand new game view. */
  const [round, setRound] = useState(0);
  const [freshBadges, setFreshBadges] = useState<readonly BadgeId[]>([]);

  const View = GAME_VIEWS[game.meta.id];
  if (!View) {
    return <PlayPlaceholder game={game} kid={kid} onBack={onHome} />;
  }

  function finish(finished: FinishedPlay): void {
    /**
     * Badges before and after this game. Both are worked out here, from the
     * same list, so the answer does not depend on when the server replies.
     */
    const gameIds = GAMES.map((item) => item.meta.id);
    const before = earnedBadges(sessions, kid.id, gameIds, nowIso);
    const after = earnedBadges(
      [
        ...sessions,
        {
          id: finished.id,
          kidId: kid.id,
          gameId: finished.gameId,
          level: kid.level,
          score: finished.score,
          detail: finished.detail,
          playedAt: new Date().toISOString(),
          durationMs: Math.round(finished.durationMs),
        },
      ],
      kid.id,
      gameIds,
      nowIso,
    );
    setFreshBadges(isGuest(kid) ? [] : newlyEarned(before, after));

    setPlay(finished);
    setPhase("result");
    onSave(finished);
  }

  function playAgain(): void {
    setBestBefore(previousBest);
    setPlay(null);
    setFreshBadges([]);
    setRound(round + 1);
    setPhase("countdown");
  }

  if (phase === "countdown") {
    return (
      <Countdown
        title={`${kid.name} · ${LEVELS[kid.level].label}`}
        how={game.meta.how}
        onDone={() => setPhase("playing")}
      />
    );
  }

  if (phase === "result" && play) {
    return (
      <ResultScreen
        play={play}
        gameName={game.meta.name}
        scoreUnit={scoreUnitLabel(play.score, game.meta)}
        kidName={kid.name}
        previousBest={bestBefore}
        wasSaved={!isGuest(kid)}
        newBadges={freshBadges}
        onPlayAgain={playAgain}
        onHome={onHome}
      />
    );
  }

  return <View key={round} kid={kid} onFinish={finish} onQuit={onHome} />;
}
