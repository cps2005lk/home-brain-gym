import { useState } from "react";
import { LEVELS } from "../core/level";
import { isGuest } from "../data/defaults";
import type { Kid } from "../data/types";
import type { AnyGame } from "../games";
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
  readonly onSave: (play: FinishedPlay) => void;
  readonly onHome: () => void;
}

type Phase = "countdown" | "playing" | "result";

export function PlayScreen({ game, kid, previousBest, onSave, onHome }: PlayScreenProps) {
  const [phase, setPhase] = useState<Phase>("countdown");
  const [play, setPlay] = useState<FinishedPlay | null>(null);
  /** Frozen before the play starts, so the result compares with the old best. */
  const [bestBefore, setBestBefore] = useState(previousBest);
  /** Changing this number makes React build a brand new game view. */
  const [round, setRound] = useState(0);

  const View = GAME_VIEWS[game.meta.id];
  if (!View) {
    return <PlayPlaceholder game={game} kid={kid} onBack={onHome} />;
  }

  function finish(finished: FinishedPlay): void {
    setPlay(finished);
    setPhase("result");
    onSave(finished);
  }

  function playAgain(): void {
    setBestBefore(previousBest);
    setPlay(null);
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
        scoreUnit={game.meta.scoreUnit}
        kidName={kid.name}
        previousBest={bestBefore}
        wasSaved={!isGuest(kid)}
        onPlayAgain={playAgain}
        onHome={onHome}
      />
    );
  }

  return <View key={round} kid={kid} onFinish={finish} onQuit={onHome} />;
}
