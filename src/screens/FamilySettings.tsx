import { LEVELS, LEVEL_IDS } from "../core/level";
import { LIMIT_CHOICES, timeLimitStatus } from "../data/timeLimit";
import { KID_COLOR_TOKENS, type GameSession, type Kid } from "../data/types";

interface FamilySettingsProps {
  readonly kids: readonly Kid[];
  readonly sessions: readonly GameSession[];
  readonly nowIso: string;
  readonly onSaveKid: (kid: Kid) => void;
}

/**
 * Parent-only settings: the level and the daily time limit.
 *
 * These two are deliberately not on the kids' screens. A kid could otherwise
 * switch to an easier level to get a better "best", or turn off their own
 * limit.
 */
export function FamilySettings({ kids, sessions, nowIso, onSaveKid }: FamilySettingsProps) {
  return (
    <div className="card editor">
      <span className="label">Settings</span>

      {kids.map((kid) => {
        const status = timeLimitStatus(kid, sessions, nowIso);
        return (
          <div key={kid.id} className="setting-row">
            <div className="row">
              <div className="avatar small" style={{ background: KID_COLOR_TOKENS[kid.color] }}>
                {kid.avatar}
              </div>
              <div className="grow">
                <div className="kid-name">{kid.name}</div>
                <div className="kid-meta">
                  {status.limitMinutes === null
                    ? `${status.usedMinutes} min played today · no limit`
                    : `${status.usedMinutes} of ${status.limitMinutes} min played today`}
                </div>
              </div>
            </div>

            <span className="label">Level</span>
            <div className="tabs">
              {LEVEL_IDS.map((levelId) => (
                <button
                  key={levelId}
                  type="button"
                  className="tab"
                  aria-pressed={kid.level === levelId}
                  onClick={() => onSaveKid({ ...kid, level: levelId })}
                >
                  {LEVELS[levelId].label}
                </button>
              ))}
            </div>

            <span className="label">Minutes per day</span>
            <div className="tabs">
              {LIMIT_CHOICES.map((minutes) => (
                <button
                  key={minutes ?? "none"}
                  type="button"
                  className="tab"
                  aria-pressed={kid.dailyLimitMinutes === minutes}
                  onClick={() => onSaveKid({ ...kid, dailyLimitMinutes: minutes })}
                >
                  {minutes === null ? "No limit" : `${minutes} min`}
                </button>
              ))}
            </div>
          </div>
        );
      })}

      <p className="sub" style={{ margin: 0 }}>
        A game that has already started always finishes and still counts. The limit only stops a new
        game. Every day starts again at midnight.
      </p>
    </div>
  );
}
