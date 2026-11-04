import type { ComponentType } from "react";
import type { GameViewProps } from "../play/types";
import { ArrowRushView } from "./arrow-rush/view";
import { BackOneView } from "./back-one/view";
import { ColorClashView } from "./color-clash/view";
import { PatternMemoryView } from "./pattern-memory/view";
import { QuickAddView } from "./quick-add/view";
import { RuleSwitchView } from "./rule-switch/view";
import { TapOrderView } from "./tap-order/view";

/**
 * Which React screen draws which game. Adding a game means one line here and
 * one line in index.ts; nothing else in the app changes.
 *
 * Views are kept apart from the logic registry on purpose: index.ts stays free
 * of React, so game rules can be tested with no browser.
 */
export const GAME_VIEWS: Record<string, ComponentType<GameViewProps>> = {
  "color-clash": ColorClashView,
  "pattern-memory": PatternMemoryView,
  "rule-switch": RuleSwitchView,
  "arrow-rush": ArrowRushView,
  "quick-add": QuickAddView,
  "back-one": BackOneView,
  "tap-order": TapOrderView,
};
