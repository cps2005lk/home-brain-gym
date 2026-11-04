/**
 * A declaration file (.d.ts) describes types for things that exist but have no
 * TypeScript source here - a bit like `extern` declarations. This one teaches
 * the compiler which environment variables we expect.
 *
 * Vite replaces import.meta.env.VITE_* at build time with the real text from
 * .env.local. Only names starting with VITE_ are sent to the browser, so a
 * plain SUPABASE_ACCESS_TOKEN can never leak into the app.
 *
 * Both are optional on purpose: the app must still run with no Supabase set up.
 */
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
