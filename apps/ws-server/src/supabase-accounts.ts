import { createRemoteJWKSet, jwtVerify } from "jose";
import type { Accounts, Profile } from "./accounts.js";
import { USERNAME_PATTERN, isOwnAvatarUrl } from "./account-rules.js";

/**
 * Accounts backed by a Supabase project: the access token is verified against
 * the project's published signing keys, then the player's row is read from
 * `profiles`. Anything wrong, slow or unreachable means "guest" — joining a
 * room never waits on Supabase for longer than `timeoutMs`.
 */
export function createSupabaseAccounts({
  url,
  secretKey,
  timeoutMs = 3000,
  log = (reason) => console.warn(`[accounts] ${reason}`),
}: {
  url: string;
  secretKey: string;
  timeoutMs?: number;
  /** Told why a lookup failed. Never receives a token. */
  log?: (reason: string) => void;
}): Accounts {
  const base = url.replace(/\/+$/, "");
  const jwks = createRemoteJWKSet(
    new URL(`${base}/auth/v1/.well-known/jwks.json`),
    { timeoutDuration: timeoutMs },
  );

  // Every failure turns a player into a guest, silently for them — so say
  // why here, or a wrong key or URL looks exactly like "nobody has an account".
  // Each distinct reason is logged at most once a minute.
  const lastLogged = new Map<string, number>();
  function problem(reason: string) {
    const now = Date.now();
    if (now - (lastLogged.get(reason) ?? -Infinity) < 60_000) return;
    lastLogged.set(reason, now);
    log(`player treated as a guest: ${reason}`);
  }

  async function lookup(
    accessToken: string,
    signal: AbortSignal,
  ): Promise<Profile | null> {
    const { payload } = await jwtVerify(accessToken, jwks, {
      issuer: `${base}/auth/v1`,
      audience: "authenticated",
    });
    const userId = payload.sub;
    if (!userId) return null;

    const res = await fetch(
      `${base}/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}&select=username,avatar_url`,
      {
        headers: { apikey: secretKey, Authorization: `Bearer ${secretKey}` },
        signal,
      },
    );
    if (!res.ok) {
      problem(`reading profiles answered HTTP ${res.status}`);
      return null;
    }
    const [row] = (await res.json()) as {
      username?: unknown;
      avatar_url?: unknown;
    }[];

    // The row was written by the player's browser: trust nothing in it.
    if (!row) return null; // signed up, hasn't finished onboarding: not a problem
    if (
      typeof row.username !== "string" ||
      !USERNAME_PATTERN.test(row.username) ||
      !isOwnAvatarUrl(row.avatar_url, base, userId)
    ) {
      problem(
        "a profile row has a username or avatar URL that breaks the rules",
      );
      return null;
    }
    return { userId, username: row.username, avatarUrl: row.avatar_url };
  }

  return {
    async profileFromToken(accessToken) {
      const abort = new AbortController();
      let timer: ReturnType<typeof setTimeout> | undefined;
      const timeout = new Promise<null>((resolve) => {
        timer = setTimeout(() => {
          abort.abort();
          problem(`Supabase took longer than ${timeoutMs}ms`);
          resolve(null);
        }, timeoutMs);
      });
      try {
        return await Promise.race([
          lookup(accessToken, abort.signal).catch((err: unknown) => {
            // jose and fetch errors describe the failure, never the token.
            const e = err as { code?: string; name?: string; message?: string };
            if (!abort.signal.aborted)
              problem(`${e.code ?? e.name ?? "error"}: ${e.message ?? ""}`);
            return null;
          }),
          timeout,
        ]);
      } finally {
        clearTimeout(timer);
      }
    },
  };
}
