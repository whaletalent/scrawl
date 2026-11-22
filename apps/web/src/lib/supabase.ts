import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
// Public by design: it ships in the bundle, and the database's row-level
// security is what protects the data. The secret key never comes near the web app.
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/** Accounts are optional: without a Supabase project the site has no login at all. */
export const ACCOUNTS_ENABLED = Boolean(url && publishableKey);

/**
 * Whether the project has Google sign-in turned on (Authentication →
 * Providers → Google). Asked once per page; false when it can't be told.
 */
let googleAnswer: Promise<boolean> | null = null;
export function googleSignInEnabled(): Promise<boolean> {
  if (!url || !publishableKey) return Promise.resolve(false);
  googleAnswer ??= fetch(`${url}/auth/v1/settings`, {
    headers: { apikey: publishableKey },
  })
    .then((r) => (r.ok ? r.json() : null))
    .then((s) => Boolean(s?.external?.google))
    .catch(() => false);
  return googleAnswer;
}

export const supabase: SupabaseClient | null =
  url && publishableKey
    ? createClient(url, publishableKey, {
        auth: {
          flowType: "pkce",
          // The room page's own `?code=ABCDE` must never be mistaken for an
          // OAuth callback, so the Google redirect is handled by hand on
          // /login/ only (see `completeOAuthRedirect` in lib/account.ts).
          detectSessionInUrl: false,
        },
      })
    : null;
