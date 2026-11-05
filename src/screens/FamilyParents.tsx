import { useCallback, useEffect, useState } from "react";
import type { FamilyAdmin } from "../data/familyAdmin";
import {
  daysLeft,
  formatInviteCode,
  inviteStatus,
  invitesLeft,
  type FamilyInvite,
  type FamilyParent,
} from "../data/invites";

interface FamilyParentsProps {
  readonly admin: FamilyAdmin;
  /** The signed-in parent, so we can mark "you" and not offer self-removal. */
  readonly myUserId: string;
  readonly nowIso: string;
}

/** Who can open this family, and the invites waiting to be used. */
export function FamilyParents({ admin, myUserId, nowIso }: FamilyParentsProps) {
  const [parents, setParents] = useState<readonly FamilyParent[]>([]);
  const [invites, setInvites] = useState<readonly FamilyInvite[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  /**
   * `nowIso` is the moment the app loaded its data, which can be minutes old.
   * An invite made just now would then read "8 days left" for a 7 day invite.
   * Event handlers may read the clock (they are not drawing), so we refresh
   * this whenever the list is reloaded.
   */
  const [asOf, setAsOf] = useState(nowIso);

  const refresh = useCallback(async () => {
    const [people, codes] = await Promise.all([admin.listParents(), admin.listInvites()]);
    setParents(people);
    setInvites(codes);
    setAsOf(new Date().toISOString());
  }, [admin]);

  /**
   * Load the list when the screen opens. The work happens inside an async
   * function, so React state is only touched after the server answers -
   * never straight inside the effect.
   */
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [people, codes] = await Promise.all([admin.listParents(), admin.listInvites()]);
        if (cancelled) return;
        setParents(people);
        setInvites(codes);
        setAsOf(new Date().toISOString());
      } catch (problem: unknown) {
        if (!cancelled) setError(problem instanceof Error ? problem.message : String(problem));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [admin]);

  async function run(work: () => Promise<unknown>): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      await work();
      await refresh();
    } catch (problem: unknown) {
      setError(problem instanceof Error ? problem.message : String(problem));
    } finally {
      setBusy(false);
    }
  }

  const open = invites.filter((invite) => inviteStatus(invite, asOf) === "open");
  const left = invitesLeft(invites, asOf);

  return (
    <div className="card editor">
      <span className="label">Parents in this family</span>

      <ul className="plays">
        {parents.map((parent) => (
          <li key={parent.userId}>
            <span className="grow">
              {parent.email ?? "a parent"}
              {parent.userId === myUserId && <b> · you</b>}
            </span>
            {parent.userId !== myUserId &&
              (removing === parent.userId ? (
                <>
                  <button
                    type="button"
                    className="ghost"
                    disabled={busy}
                    onClick={() =>
                      void run(async () => {
                        await admin.removeParent(parent.userId);
                        setRemoving(null);
                      })
                    }
                  >
                    Remove
                  </button>
                  <button type="button" className="ghost" onClick={() => setRemoving(null)}>
                    Keep
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="ghost"
                  aria-label={`Remove ${parent.email ?? "this parent"}`}
                  onClick={() => setRemoving(parent.userId)}
                >
                  ✕
                </button>
              ))}
          </li>
        ))}
      </ul>

      <div>
        <span className="label">Invite another parent</span>
        <p className="sub" style={{ margin: "4px 0 0" }}>
          Make a code and send it to them. They sign in with Google, then type the code. It works
          once and lasts 7 days.
        </p>
      </div>

      <button
        type="button"
        className="play"
        disabled={busy || left === 0}
        onClick={() => void run(() => admin.createInvite())}
      >
        {left === 0 ? "Too many invites open" : "Make an invite code"}
      </button>

      {open.length > 0 && (
        <ul className="plays">
          {open.map((invite) => (
            <li key={invite.id}>
              <span className="grow">
                <b className="code">{formatInviteCode(invite.code)}</b>
                <small style={{ display: "block", color: "var(--muted)" }}>
                  {daysLeft(invite, asOf)} days left
                  {invite.email ? ` · only for ${invite.email}` : ""}
                </small>
              </span>
              <button
                type="button"
                className="ghost"
                disabled={busy}
                onClick={() => void run(() => admin.revokeInvite(invite.id))}
              >
                Cancel
              </button>
            </li>
          ))}
        </ul>
      )}

      {error && (
        <p className="sub" style={{ margin: 0, color: "var(--bad)" }}>
          {error}
        </p>
      )}
    </div>
  );
}
