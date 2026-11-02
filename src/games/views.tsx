import type { ComponentType } from "react";
import type { GameViewProps } from "../play/types";
import { ColorClashView } from "./color-clash/view";

/**
 * Which React screen draws which game. Adding a game means one line here and
 * one line in index.ts; nothing else in the app changes.
 *
 * Views are kept apart from the logic registry on purpose: index.ts stays free
 * of React, so game rules can be tested with no browser.
 */
export const GAME_VIEWS: Record<string, ComponentType<GameViewProps>> = {
  "color-clash": ColorClashView,
};
