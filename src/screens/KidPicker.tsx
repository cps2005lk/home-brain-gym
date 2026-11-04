import { LEVELS } from "../core/level";
import { GUEST_KID } from "../data/defaults";
import { streakInfo } from "../data/streaks";
import { timeLeftLabel, timeLimitStatus } from "../data/timeLimit";
import { KID_COLOR_TOKENS, type GameSession, type Kid } from "../data/types";

interface KidPickerProps {
  readonly kids: readonly Kid[];
  readonly sessions: readonly GameSession[];
  readonly lastKidId: string | null;
  /** "Now", measured once when the data loaded. */
  readonly nowIso: string;
  readonly onChoose: (kidId: string) => void;
  readonly onEdit: (kid: Kid) => void;
  readonly onParentArea: () => void;
}

/** First screen: the kid taps their own tile. No password, no lock. */
export function KidPicker({
  kids,
  sessions,
  lastKidId,
  nowIso,
  onChoose,
  onEdit,
  onParentArea,
}: KidPickerProps) {
  /** Put whoever played last on this device first. */
  const ordered = [...kids].toSorted((a, b) => {
    if (a.id === lastKidId) return -1;
    if (b.id === lastKidId) return 1;
    return 0;
  });

  return (
    <>
      <div className="row">
        <div className="grow">
          <h1>
            Who is <span>playing?</span>
          </h1>
          <p className="sub">Tap your picture to start.</p>
        </div>
        <button type="button" className="ghost" onClick={onParentArea}>
          Parent
        </button>
      </div>

      <div className="kids">
        {ordered.map((kid) => {
          const streak = streakInfo(sessions, kid.id, nowIso);
          const timeLeft = timeLeftLabel(timeLimitStatus(kid, sessions, nowIso));
          return (
            <div key={kid.id} className="row">
              <button type="button" className="kid-tile grow" onClick={() => onChoose(kid.id)}>
                <div className="avatar" style={{ background: KID_COLOR_TOKENS[kid.color] }}>
                  {kid.avatar}
                </div>
                <div className="grow">
                  <div className="kid-name">{kid.name}</div>
                  <div className="kid-meta">
                    {streak.current > 0 && (
                      <span className="streak">
                        🔥 {streak.current} day{streak.current === 1 ? "" : "s"} ·{" "}
                      </span>
                    )}
                    {LEVELS[kid.level].label}
                  </div>
                  {timeLeft && <div className="kid-meta">⏱ {timeLeft}</div>}
                  <div className="kid-meta">
                    {streak.todayDone
                      ? "Today is done ✅"
                      : `${streak.gamesLeftToday} more game${streak.gamesLeftToday === 1 ? "" : "s"} today`}
                  </div>
                </div>
              </button>
              <button
                type="button"
                className="ghost"
                aria-label={`Change ${kid.name}'s picture and name`}
                onClick={() => onEdit(kid)}
              >
                ✎
              </button>
            </div>
          );
        })}

        <button type="button" className="kid-tile guest" onClick={() => onChoose(GUEST_KID.id)}>
          <div className="avatar" style={{ background: KID_COLOR_TOKENS[GUEST_KID.color] }}>
            {GUEST_KID.avatar}
          </div>
          <div className="grow">
            <div className="kid-name">Guest</div>
            <div className="kid-meta">Just visiting · nothing is saved</div>
          </div>
        </button>
      </div>
    </>
  );
}
