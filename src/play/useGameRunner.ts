import { useCallback, useEffect, useRef, useState } from "react";
import type { GameModule, GameProgress } from "../core/game";
import type { LevelId } from "../core/level";
import { createRng, type Rng } from "../core/random";

export interface GameRunner<TState, TInput> {
  readonly state: TState;
  readonly progress: GameProgress;
  /** Send the kid's answer into the game. */
  readonly answer: (input: TInput) => void;
  /** Grows by 1 on every answer. The shell uses it to re-trigger the flash. */
  readonly answerCount: number;
}

/**
 * Runs any game that follows the contract: keeps its state, feeds it the clock,
 * and tells the screen when the play is finished.
 *
 * The generics make this work for every game: give it Color Clash and `answer`
 * only accepts a colour index; give it Arrow Rush and it only accepts
 * "left" | "right". Like a generic service class in C#, except TypeScript works
 * the types out from the game you pass in.
 *
 * It returns null for the very first moment, before the game is built. Drawing
 * must be *pure* in React - no clock, no random numbers - so the game is
 * created in an effect, which is the place for talking to the outside world.
 */
export function useGameRunner<TState, TInput, TLevel>(
  game: GameModule<TState, TInput, TLevel>,
  level: LevelId,
  onFinish: (progress: GameProgress, durationMs: number) => void,
): GameRunner<TState, TInput> | null {
  /** `useRef` holds a value that survives redraws but never causes one. */
  const rng = useRef<Rng | null>(null);
  const startedAtMs = useRef(0);
  const finished = useRef(false);
  const [state, setState] = useState<TState | null>(null);
  const [answerCount, setAnswerCount] = useState(0);

  /** Build the game once, when the screen appears. */
  useEffect(() => {
    const generator = createRng();
    rng.current = generator;
    startedAtMs.current = performance.now();
    finished.current = false;
    setState(game.create(level, generator, startedAtMs.current));
    setAnswerCount(0);
  }, [game, level]);

  /**
   * The heartbeat. requestAnimationFrame runs about 60 times a second, in step
   * with the screen, so the clock bar and the memory lights stay smooth. The
   * function we return is the cleanup - React calls it when the screen closes,
   * like Dispose() in C#.
   */
  useEffect(() => {
    let frame = 0;
    const tick = (): void => {
      const generator = rng.current;
      if (generator) {
        setState((current) =>
          current === null || game.isOver(current)
            ? current
            : game.reduce(current, { kind: "tick", atMs: performance.now() }, generator),
        );
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [game]);

  /** Report the end once, after React has drawn the final state. */
  useEffect(() => {
    if (state === null || finished.current || !game.isOver(state)) return;
    finished.current = true;
    onFinish(game.progress(state), performance.now() - startedAtMs.current);
  }, [game, state, onFinish]);

  const answer = useCallback(
    (input: TInput) => {
      const generator = rng.current;
      if (!generator) return;
      setState((current) =>
        current === null || game.isOver(current)
          ? current
          : game.reduce(current, { kind: "answer", input, atMs: performance.now() }, generator),
      );
      setAnswerCount((count) => count + 1);
    },
    [game],
  );

  if (state === null) return null;
  return { state, progress: game.progress(state), answer, answerCount };
}
