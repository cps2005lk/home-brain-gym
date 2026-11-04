import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "../data/supabaseClient";

export interface AuthState {
  /** The signed-in parent, or null. */
  readonly session: Session | null;
  /** False until we know whether a saved session exists. */
  readonly ready: boolean;
  readonly error: string | null;
  readonly signInWithGoogle: () => Promise<void>;
  readonly signOut: () => Promise<void>;
}

/**
 * Who is signed in, and how to change that.
 *
 * Supabase keeps the session in localStorage and refreshes it by itself, so a
 * parent signs in once per device. We only listen for changes.
 */
export function useAuth(): AuthState {
  const [session, setSession] = useState<Session | null>(null);
  /**
   * With no Supabase settings there is nothing to wait for, so we start
   * "ready". Working the value out here keeps the effect below free of
   * immediate setState calls, which React (and the linter) dislike.
   */
  const [ready, setReady] = useState(!isSupabaseConfigured);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const client = supabase;
    if (!client) return;

    // 1. What do we have already (page was reloaded)?
    void client.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });

    // 2. Then follow every later change: sign in, sign out, token refresh.
    const { data } = client.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setReady(true);
    });

    // Stop listening when the screen goes away.
    return () => data.subscription.unsubscribe();
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const client = supabase;
    if (!client) {
      setError("Supabase is not set up on this device yet.");
      return;
    }
    setError(null);
    const { error: signInError } = await client.auth.signInWithOAuth({
      provider: "google",
      options: {
        // Come back to the page the parent started from.
        redirectTo: window.location.origin,
      },
    });
    if (signInError) setError(signInError.message);
  }, []);

  const signOut = useCallback(async () => {
    const client = supabase;
    if (!client) return;
    const { error: signOutError } = await client.auth.signOut();
    if (signOutError) setError(signOutError.message);
  }, []);

  return { session, ready, error, signInWithGoogle, signOut };
}

export { isSupabaseConfigured };
