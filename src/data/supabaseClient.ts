import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

const url = import.meta.env.VITE_SUPABASE_URL;
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

/** False when .env.local is missing: the app then stays on the device only. */
export const isSupabaseConfigured = Boolean(url && publishableKey);

/**
 * One client for the whole app, typed with the generated Database type.
 *
 * Because of that generic, supabase.from("kids") knows every column, and a
 * misspelled name or a wrong value is a compile error - not a 400 at runtime.
 */
export const supabase: SupabaseClient<Database> | null =
  url && publishableKey
    ? createClient<Database>(url, publishableKey, {
        auth: {
          // Keep the parent signed in on this device and refresh quietly.
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      })
    : null;
