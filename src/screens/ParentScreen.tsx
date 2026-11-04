import type { AuthState } from "../auth/useAuth";
import { isSupabaseConfigured } from "../data/supabaseClient";

interface ParentScreenProps {
  readonly auth: AuthState;
  readonly onBack: () => void;
}

/**
 * The parent area. Kids never need this screen - they just tap their picture
 * and play. Signing in is what turns on syncing between the phone, the tablet
 * and this Mac, and later it unlocks the progress charts and the settings.
 */
export function ParentScreen({ auth, onBack }: ParentScreenProps) {
  const email = auth.session?.user.email ?? null;

  return (
    <>
      <div className="row">
        <h1 className="grow">
          Parent <span>area</span>
        </h1>
        <button type="button" className="ghost" onClick={onBack}>
          Back
        </button>
      </div>

      {!isSupabaseConfigured && (
        <div className="card">
          <p style={{ margin: 0 }}>
            This device has no Supabase settings, so the app is saving on the device only.
            Everything still works; nothing is synced.
          </p>
        </div>
      )}

      {isSupabaseConfigured && !auth.ready && <p className="sub">Checking…</p>}

      {isSupabaseConfigured && auth.ready && !email && (
        <div className="card editor">
          <p style={{ margin: 0 }}>
            Sign in once on each device to keep the same scores everywhere. Kids never sign in -
            this is only for you.
          </p>
          <button type="button" className="play" onClick={() => void auth.signInWithGoogle()}>
            Continue with Google
          </button>
          <p className="sub" style={{ margin: 0 }}>
            Games keep working when you are signed out or offline. Scores are saved on the device
            first.
          </p>
        </div>
      )}

      {isSupabaseConfigured && email && (
        <div className="card editor">
          <div>
            <span className="label">Signed in as</span>
            <div className="kid-name">{email}</div>
          </div>
          <button type="button" className="ghost" onClick={() => void auth.signOut()}>
            Sign out
          </button>
        </div>
      )}

      {auth.error && (
        <div className="card" style={{ borderColor: "var(--bad)" }}>
          <span className="label">Sign-in problem</span>
          <p style={{ margin: 0 }}>{auth.error}</p>
        </div>
      )}
    </>
  );
}
