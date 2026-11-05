import { useState } from "react";
import { isLikelyInviteCode, normaliseInviteCode } from "../data/invites";

interface FamilyWelcomeProps {
  readonly email: string | null;
  readonly onStartFamily: () => Promise<void>;
  readonly onJoinFamily: (code: string) => Promise<void>;
  readonly onBack: () => void;
}

/**
 * Shown to a parent who is signed in but belongs to no family yet.
 *
 * This screen exists because of one rule in the database: a person can only be
 * in one family. If the app quietly made a family for every new sign-in, the
 * second parent's invite code would always be refused - so we ask first.
 */
export function FamilyWelcome({ email, onStartFamily, onJoinFamily, onBack }: FamilyWelcomeProps) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clean = normaliseInviteCode(code);
  const canJoin = isLikelyInviteCode(clean) && !busy;

  async function run(work: () => Promise<void>): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      await work();
    } catch (problem: unknown) {
      setError(problem instanceof Error ? problem.message : String(problem));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="row">
        <h1 className="grow">
          Your <span>family</span>
        </h1>
        <button type="button" className="ghost" onClick={onBack}>
          Back
        </button>
      </div>

      {email && <p className="sub">Signed in as {email}</p>}

      <div className="card editor">
        <div>
          <span className="label">Joining your partner?</span>
          <p style={{ margin: "4px 0 0" }}>
            Type the invite code they sent you. It looks like <b>K7P4-2RMX</b>.
          </p>
        </div>
        <input
          type="text"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          placeholder="K7P4-2RMX"
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          maxLength={12}
          aria-label="Invite code"
        />
        <button
          type="button"
          className="play"
          disabled={!canJoin}
          onClick={() => void run(() => onJoinFamily(clean))}
        >
          {busy ? "Joining…" : "Join this family"}
        </button>
      </div>

      <div className="card editor">
        <div>
          <span className="label">Starting fresh?</span>
          <p style={{ margin: "4px 0 0" }}>
            Make a new family for your own kids. The kids already on this device come with you.
          </p>
        </div>
        <button
          type="button"
          className="ghost"
          disabled={busy}
          onClick={() => void run(onStartFamily)}
        >
          Start a new family
        </button>
      </div>

      {error && (
        <div className="card" style={{ borderColor: "var(--bad)" }}>
          <span className="label">That did not work</span>
          <p style={{ margin: 0 }}>{error}</p>
        </div>
      )}
    </>
  );
}
