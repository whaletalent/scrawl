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
}: {
  url: string;
  secretKey: string;
  timeoutMs?: number;
}): Accounts {
  const base = url.replace(/\/+$/, "");
  const jwks = createRemoteJWKSet(
    new URL(`${base}/auth/v1/.well-known/jwks.json`),
    { timeoutDuration: timeoutMs },
  );

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
    if (!res.ok) return null;
    const [row] = (await res.json()) as {
      username?: unknown;
      avatar_url?: unknown;
    }[];

    // The row was written by the player's browser: trust nothing in it.
    if (
      !row ||
      typeof row.username !== "string" ||
      !USERNAME_PATTERN.test(row.username) ||
      !isOwnAvatarUrl(row.avatar_url, base, userId)
    )
      return null;
    return { userId, username: row.username, avatarUrl: row.avatar_url };
  }

  return {
    async profileFromToken(accessToken) {
      const abort = new AbortController();
      let timer: ReturnType<typeof setTimeout> | undefined;
      const timeout = new Promise<null>((resolve) => {
        timer = setTimeout(() => {
          abort.abort();
          resolve(null);
        }, timeoutMs);
      });
      try {
        return await Promise.race([
          lookup(accessToken, abort.signal).catch(() => null),
          timeout,
        ]);
      } finally {
        clearTimeout(timer);
      }
    },
  };
}
