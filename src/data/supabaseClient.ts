import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

const url = import.meta.env.VITE_SUPABASE_URL;
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

/** False when .env.local is missing: the app then stays on the device only. */
export const isSupabaseConfigured = Boolean(url && publishableKey);

export type GymSupabaseClient = SupabaseClient<Database>;

/** Built once, then reused. The promise is kept, not just the result. */
let clientPromise: Promise<GymSupabaseClient | null> | null = null;

/**
 * The Supabase client, fetched only when it is first needed.
 *
 * `import("...")` written as a *function call* tells Vite to put that library
 * in its own file and download it later. The Supabase client is about a third
 * of our code, and the kid picker does not need it, so the first screen now
 * appears without waiting for it.
 *
 * Note the `import type` at the top of this file: types are erased when the
 * code is built, so naming the type costs nothing at runtime.
 */
export function getSupabase(): Promise<GymSupabaseClient | null> {
  if (!url || !publishableKey) return Promise.resolve(null);

  clientPromise ??= import("@supabase/supabase-js").then(({ createClient }) =>
    createClient<Database>(url, publishableKey, {
      auth: {
        // Keep the parent signed in on this device and refresh quietly.
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    }),
  );

  return clientPromise;
}
