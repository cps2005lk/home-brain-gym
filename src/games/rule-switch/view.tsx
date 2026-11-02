import { useCallback } from "react";
import { newId } from "../../core/ids";
import type { GameProgress } from "../../core/game";
import { PlayShell } from "../../play/PlayShell";
import type { GameViewProps } from "../../play/types";
import { useGameRunner } from "../../play/useGameRunner";
import { ruleSwitch, type RuleSwitchInput } from "./logic";

const BUTTONS: readonly {
  readonly input: RuleSwitchInput;
  readonly top: string;
  readonly bottom: string;
}[] = [
  { input: "oddOrSmaller", top: "Odd", bottom: "or Smaller" },
  { input: "evenOrBigger", top: "Even", bottom: "or Bigger" },
];

export function RuleSwitchView({ kid, onFinish, onQuit }: GameViewProps) {
  const handleFinish = useCallback(
    (progress: GameProgress, durationMs: number) => {
      onFinish({
        id: newId(),
        gameId: ruleSwitch.meta.id,
        score: progress.score,
        detail: progress.detail,
        durationMs,
      });
    },
    [onFinish],
  );

  const runner = useGameRunner(ruleSwitch, kid.level, handleFinish);
  if (!runner) return null;
  const { state, progress, answer, answerCount } = runner;

  const level = ruleSwitch.levels[kid.level];

  return (
    <PlayShell
      meta={ruleSwitch.meta}
      progress={progress}
      totalMs={level.seconds * 1000}
      flash={state.lastAnswer}
      flashToken={answerCount}
      onQuit={onQuit}
      board={
        <div className="center">
          <div className={`rulecard ${state.card.rule}`}>
            {/* Junior sees the question; Teen must remember the card colour. */}
            {level.showRule && (
              <span className="rule">
                {state.card.rule === "parity" ? "Odd or even?" : "Smaller or bigger than 5?"}
              </span>
            )}
            <span className="big">{state.card.value}</span>
          </div>
          <div className="legend">
            <span>
              <i className="dot" style={{ background: "var(--blue)" }} /> Blue = odd or even
            </span>
            <span>
              <i className="dot" style={{ background: "var(--yellow)" }} /> Yellow = smaller or
              bigger than 5
            </span>
          </div>
        </div>
      }
      answers={BUTTONS.map((button) => (
        <button
          key={button.input}
          type="button"
          className="ans"
          onClick={() => answer(button.input)}
        >
          <span>
            {button.top}
            <small>{button.bottom}</small>
          </span>
        </button>
      ))}
    />
  );
}
