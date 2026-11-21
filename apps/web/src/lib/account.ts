/**
 * Every call the site makes to Supabase. Together with `supabase.ts` this is
 * the only place that knows Supabase exists; components go through
 * `useAccount` and the functions below.
 */
import { supabase } from "./supabase";
import { BASE_PATH } from "./routes";

export interface Profile {
  userId: string;
  username: string;
  avatarUrl: string;
}

export type AccountError =
  | "email-taken"
  | "username-taken"
  | "invalid-credentials"
  | "weak-password"
  | "network"
  | "unknown";

const MESSAGES: Record<AccountError, string> = {
  "email-taken": "Esse e-mail já tem conta",
  "username-taken": "Esse username já existe",
  "invalid-credentials": "E-mail ou senha incorretos",
  "weak-password": "A senha precisa ter pelo menos 8 caracteres",
  network: "Não deu para falar com o servidor. Tente de novo.",
  unknown: "Algo deu errado. Tente de novo.",
};

export function accountErrorMessage(e: AccountError): string {
  return MESSAGES[e];
}

/**
 * How long the game waits on Supabase before carrying on without it. An
 * account is never required to play, so a slow or dead Supabase must cost a
 * player a few seconds at most — never the page.
 */
export const ACCOUNT_TIMEOUT_MS = 3000;

function withTimeout<T>(promise: PromiseLike<T>, fallback: T): Promise<T> {
  return Promise.race([
    Promise.resolve(promise).catch(() => fallback),
    new Promise<T>((resolve) =>
      setTimeout(() => resolve(fallback), ACCOUNT_TIMEOUT_MS),
    ),
  ]);
}

/** Where Google sends the player back to. */
const OAUTH_RETURN_PATH = "/login/";

function authError(error: {
  code?: string;
  name?: string;
  status?: number;
}): AccountError {
  switch (error.code) {
    case "user_already_exists":
    case "email_exists":
      return "email-taken";
    case "invalid_credentials":
      return "invalid-credentials";
    case "weak_password":
      return "weak-password";
  }
  if (error.name === "AuthRetryableFetchError" || error.status === 0)
    return "network";
  return "unknown";
}

async function currentUserId(): Promise<string | null> {
  const { data } = (await supabase?.auth.getSession()) ?? { data: null };
  return data?.session?.user.id ?? null;
}

export async function signUpWithEmail(
  email: string,
  password: string,
): Promise<AccountError | null> {
  if (!supabase) return "unknown";
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
  });
  if (error) return authError(error);
  // No session means the project is asking for e-mail confirmation, which
  // this app doesn't support (see docs/supabase-setup.md).
  return data.session ? null : "unknown";
}

export async function signInWithEmail(
  email: string,
  password: string,
): Promise<AccountError | null> {
  if (!supabase) return "unknown";
  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });
  return error ? authError(error) : null;
}

/** Leaves the site for Google; the player comes back to /login/. */
export async function signInWithGoogle(): Promise<AccountError | null> {
  if (!supabase) return "unknown";
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${window.location.origin}${BASE_PATH}${OAUTH_RETURN_PATH}`,
    },
  });
  return error ? authError(error) : null;
}

/**
 * Finishes a Google sign-in if this page load is the redirect back from it.
 * Only ever acts on /login/, so a room link's `?code=` is left alone.
 */
export async function completeOAuthRedirect(): Promise<void> {
  if (!supabase) return;
  const here = new URL(window.location.href);
  const code = here.searchParams.get("code");
  if (!code || !here.pathname.endsWith(OAUTH_RETURN_PATH)) return;

  await supabase.auth.exchangeCodeForSession(code).catch(() => null);
  window.history.replaceState(null, "", here.pathname);
}

export async function signOut(): Promise<void> {
  await supabase?.auth.signOut();
}

export async function fetchProfile(
  userId: string,
): Promise<{ profile: Profile | null; failed: boolean }> {
  if (!supabase) return { profile: null, failed: true };
  const data = await withTimeout(
    supabase
      .from("profiles")
      .select("id, username, avatar_url")
      .eq("id", userId)
      .limit(1)
      .then((result) => (result.error ? null : result.data)),
    null,
  );
  if (!data) return { profile: null, failed: true };
  const row = data[0];
  return {
    failed: false,
    profile: row
      ? { userId: row.id, username: row.username, avatarUrl: row.avatar_url }
      : null,
  };
}

/** Usernames are unique ignoring case. A failed check says "free"; the insert is the real guard. */
export async function isUsernameTaken(username: string): Promise<boolean> {
  if (!supabase) return false;
  const { data } = await supabase
    .from("profiles")
    .select("id")
    // `_` is a wildcard in ILIKE; escaped, this is a case-insensitive equality.
    .ilike("username", username.replace(/[\\_%]/g, "\\$&"))
    .limit(1);
  return (data?.length ?? 0) > 0;
}

/** Every avatar is a new file, so no cache ever shows a stale one. */
async function uploadAvatar(
  userId: string,
  png: Blob,
): Promise<string | AccountError> {
  if (!supabase) return "unknown";
  const path = `${userId}/${Date.now()}.png`;
  const { error } = await supabase.storage
    .from("avatars")
    .upload(path, await png.arrayBuffer(), { contentType: "image/png" });
  if (error) return "network";
  return supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
}

const isError = (value: string): value is AccountError => value in MESSAGES;

/** The last step of onboarding: the profile is created once, username and avatar together. */
export async function createProfile(
  username: string,
  avatarPng: Blob,
): Promise<AccountError | null> {
  const userId = await currentUserId();
  if (!supabase || !userId) return "unknown";
  if (await isUsernameTaken(username)) return "username-taken";

  const avatarUrl = await uploadAvatar(userId, avatarPng);
  if (isError(avatarUrl)) return avatarUrl;

  const { error } = await supabase
    .from("profiles")
    .insert({ id: userId, username, avatar_url: avatarUrl });
  if (!error) return null;
  // Unique violation: somebody took the username a moment ago.
  return error.code === "23505" ? "username-taken" : "unknown";
}

export async function saveAvatar(
  avatarPng: Blob,
): Promise<AccountError | null> {
  const userId = await currentUserId();
  if (!supabase || !userId) return "unknown";

  const avatarUrl = await uploadAvatar(userId, avatarPng);
  if (isError(avatarUrl)) return avatarUrl;

  const { error } = await supabase
    .from("profiles")
    .update({ avatar_url: avatarUrl })
    .eq("id", userId);
  return error ? "unknown" : null;
}

export async function changePassword(
  newPassword: string,
): Promise<AccountError | null> {
  if (!supabase) return "unknown";
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  return error ? authError(error) : null;
}

/** The signed-in player's own sign-in details, for their profile page only. */
export async function getOwnLogin(): Promise<{
  email: string;
  /** False for accounts that only ever signed in with Google. */
  hasPassword: boolean;
} | null> {
  const { data } = (await supabase?.auth.getSession()) ?? { data: null };
  const user = data?.session?.user;
  if (!user) return null;
  const providers: unknown = user.app_metadata?.providers;
  return {
    email: user.email ?? "",
    hasPassword: Array.isArray(providers) && providers.includes("email"),
  };
}

/** A fresh access token for the game server, or null when signed out / accounts off. */
export async function getAccessToken(): Promise<string | null> {
  if (!supabase) return null;
  // Reading the session may need a token refresh over the network.
  const result = await withTimeout(supabase.auth.getSession(), null);
  return result?.data.session?.access_token ?? null;
}
