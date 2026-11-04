import { useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  dailyProgress,
  dayLabel,
  gameSummary,
  recentPlays,
  weeklyProgress,
} from "../data/progress";
import { KID_COLOR_TOKENS, type GameSession, type Kid } from "../data/types";
import { findGame, GAMES } from "../games";

interface ProgressViewProps {
  readonly kids: readonly Kid[];
  readonly sessions: readonly GameSession[];
  /**
   * "Now", measured once by App when it loaded the data. Reading the clock
   * while drawing would make the same render give different answers, which
   * React (and the linter) rightly refuse.
   */
  readonly nowIso: string;
  readonly onDeleteSession: (sessionId: string) => void;
}

type Range = "days" | "weeks";

const DAYS = 14;
const WEEKS = 8;

export function ProgressView({ kids, sessions, nowIso, onDeleteSession }: ProgressViewProps) {
  const [kidId, setKidId] = useState(kids[0]?.id ?? "");
  const [gameId, setGameId] = useState(GAMES[0].meta.id);
  const [range, setRange] = useState<Range>("days");
  /** Which score is waiting for a "really remove it?" answer. */
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const kid = kids.find((item) => item.id === kidId) ?? kids[0];
  if (!kid) return null;

  const points =
    range === "days"
      ? dailyProgress(sessions, kid.id, gameId, DAYS, { nowIso })
      : weeklyProgress(sessions, kid.id, gameId, WEEKS, { nowIso });

  const summary = gameSummary(sessions, kid.id, gameId);
  const recent = recentPlays(sessions, kid.id, 10);
  const game = findGame(gameId);

  return (
    <>
      <div className="card editor">
        <div>
          <span className="label">Kid</span>
          <div className="tabs">
            {kids.map((item) => (
              <button
                key={item.id}
                type="button"
                className="tab"
                aria-pressed={item.id === kid.id}
                onClick={() => setKidId(item.id)}
              >
                <span
                  className="dot"
                  style={{ background: KID_COLOR_TOKENS[item.color], width: 14, height: 14 }}
                />
                {item.name}
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className="label">Game</span>
          <div className="tabs">
            {GAMES.map((item) => (
              <button
                key={item.meta.id}
                type="button"
                className="tab"
                aria-pressed={item.meta.id === gameId}
                onClick={() => setGameId(item.meta.id)}
              >
                {item.meta.name}
              </button>
            ))}
          </div>
        </div>

        <div className="tabs">
          <button
            type="button"
            className="tab"
            aria-pressed={range === "days"}
            onClick={() => setRange("days")}
          >
            Last {DAYS} days
          </button>
          <button
            type="button"
            className="tab"
            aria-pressed={range === "weeks"}
            onClick={() => setRange("weeks")}
          >
            Last {WEEKS} weeks
          </button>
        </div>
      </div>

      <div className="card">
        <div className="stats" style={{ marginBottom: 12 }}>
          <span>
            Best
            <br />
            <b>{summary.best ?? "–"}</b>
          </span>
          <span>
            Last
            <br />
            <b>{summary.last ?? "–"}</b>
          </span>
          <span>
            Games played
            <br />
            <b>{summary.plays}</b>
          </span>
        </div>

        {summary.plays === 0 ? (
          <p className="sub" style={{ margin: 0 }}>
            {kid.name} has not played {game?.meta.name} yet.
          </p>
        ) : (
          /* ResponsiveContainer measures the space it is given, so the chart
             fits a phone and a laptop without us writing any sizes. */
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={[...points]} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
              <CartesianGrid stroke="var(--line)" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: "var(--muted)", fontSize: 11 }}
                stroke="var(--line)"
                interval="preserveStartEnd"
              />
              <YAxis
                allowDecimals={false}
                tick={{ fill: "var(--muted)", fontSize: 11 }}
                stroke="var(--line)"
              />
              <Tooltip
                cursor={{ fill: "var(--line)", opacity: 0.4 }}
                contentStyle={{
                  background: "var(--surface)",
                  border: "2px solid var(--line)",
                  borderRadius: 12,
                  color: "var(--ink)",
                }}
              />
              <Bar name="best score" dataKey="best" fill="var(--accent)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}

        <p className="sub" style={{ margin: "8px 0 0" }}>
          Each bar is the best score of that {range === "days" ? "day" : "week"}. Empty means no
          game that {range === "days" ? "day" : "week"}.
        </p>
      </div>

      {recent.length > 0 && (
        <div className="card">
          <span className="label">Recent games</span>
          <ul className="plays">
            {recent.map((play) => {
              const playedGame = findGame(play.gameId);
              return (
                <li key={play.id}>
                  <span className="grow">
                    {dayLabel(play.playedAt.slice(0, 10))} · {playedGame?.meta.name ?? play.gameId}
                  </span>
                  <span className="pill">{play.score}</span>
                  {confirmId === play.id ? (
                    <>
                      <button
                        type="button"
                        className="ghost"
                        onClick={() => {
                          onDeleteSession(play.id);
                          setConfirmId(null);
                        }}
                      >
                        Remove
                      </button>
                      <button type="button" className="ghost" onClick={() => setConfirmId(null)}>
                        Keep
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      className="ghost"
                      aria-label={`Remove this ${playedGame?.meta.name ?? "game"} score`}
                      onClick={() => setConfirmId(play.id)}
                    >
                      ✕
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
          <p className="sub" style={{ margin: "8px 0 0" }}>
            Remove a score if the wrong kid played it.
          </p>
        </div>
      )}
    </>
  );
}
