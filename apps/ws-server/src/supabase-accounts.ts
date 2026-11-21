import { createRemoteJWKSet, jwtVerify } from "jose";
import type { Accounts, GalleryEntry, Profile } from "./accounts.js";
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
  saveTimeoutMs = 10_000,
  log = (reason) => console.warn(`[accounts] ${reason}`),
}: {
  url: string;
  secretKey: string;
  timeoutMs?: number;
  /** How long one gallery save may take before it is abandoned and undone. */
  saveTimeoutMs?: number;
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

  /** At most this many gallery saves per player per 24 hours. */
  const DAILY_SAVES = 10;
  const serviceHeaders = {
    apikey: secretKey,
    Authorization: `Bearer ${secretKey}`,
  };

  function saveProblem(reason: string) {
    const key = `save: ${reason}`;
    const now = Date.now();
    if (now - (lastLogged.get(key) ?? -Infinity) < 60_000) return;
    lastLogged.set(key, now);
    log(`drawing not saved to the gallery: ${reason}`);
  }

  /**
   * Undoes a save that didn't clearly succeed. The row goes first (it may
   * have been written even though we never heard so), then the image, so a
   * listed drawing never points at nothing and no image is left without a
   * row — which nobody but the owner could ever remove.
   */
  async function undo(imagePath: string) {
    const attempt = (url: string) =>
      fetch(url, {
        method: "DELETE",
        headers: serviceHeaders,
        signal: AbortSignal.timeout(5000),
      }).then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
      });
    try {
      await attempt(
        `${base}/rest/v1/drawings?image_path=eq.${encodeURIComponent(imagePath)}`,
      );
      await attempt(`${base}/storage/v1/object/gallery/${imagePath}`);
    } catch (err) {
      // Not rate-limited: each of these is a file to clean up by hand.
      log(
        `could not undo a failed gallery save (${imagePath}): ${String(err)}`,
      );
    }
  }

  async function store(
    entry: GalleryEntry,
  ): Promise<"saved" | "limit" | "failed"> {
    const signal = AbortSignal.timeout(saveTimeoutMs);
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const recent = await fetch(
      `${base}/rest/v1/drawings?saved_by=eq.${encodeURIComponent(entry.savedBy)}` +
        `&created_at=gte.${encodeURIComponent(since)}&select=id&limit=${DAILY_SAVES}`,
      { headers: serviceHeaders, signal },
    );
    if (!recent.ok) {
      saveProblem(`counting today's saves answered HTTP ${recent.status}`);
      return "failed";
    }
    if (((await recent.json()) as unknown[]).length >= DAILY_SAVES)
      return "limit";

    // From here on something may exist in Supabase: every way out that isn't
    // "saved" goes through `undo`.
    const imagePath = `${crypto.randomUUID()}.png`;
    try {
      // The image first: a row must never point at a file that isn't there.
      const upload = await fetch(
        `${base}/storage/v1/object/gallery/${imagePath}`,
        {
          method: "POST",
          headers: { ...serviceHeaders, "content-type": "image/png" },
          body: new Uint8Array(entry.png),
          signal,
        },
      );
      if (!upload.ok)
        throw new Error(`uploading answered HTTP ${upload.status}`);

      const insert = await fetch(`${base}/rest/v1/drawings`, {
        method: "POST",
        headers: {
          ...serviceHeaders,
          "content-type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify({
          image_path: imagePath,
          game_mode: entry.gameMode,
          theme: entry.theme,
          author_names: entry.authorNames,
          author_ids: entry.authorIds,
          saved_by: entry.savedBy,
        }),
        signal,
      });
      if (!insert.ok)
        throw new Error(`inserting answered HTTP ${insert.status}`);
      return "saved";
    } catch (err) {
      const e = err as { name?: string; message?: string };
      saveProblem(`${e.name ?? "error"}: ${e.message ?? ""}`);
      await undo(imagePath);
      return "failed";
    }
  }

  // One save at a time per player: the daily limit is "count, then write",
  // which only holds if a player's saves can't overlap. (The game server is
  // a single process, so a queue in memory is enough.)
  const queues = new Map<string, Promise<unknown>>();
  function inTurn<T>(userId: string, task: () => Promise<T>): Promise<T> {
    const run = (queues.get(userId) ?? Promise.resolve()).then(task, task);
    const tail = run.catch(() => {});
    queues.set(userId, tail);
    void tail.then(() => {
      if (queues.get(userId) === tail) queues.delete(userId);
    });
    return run;
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
    async saveDrawing(entry) {
      try {
        return await inTurn(entry.savedBy, () => store(entry));
      } catch (err) {
        const e = err as { name?: string; message?: string };
        saveProblem(`${e.name ?? "error"}: ${e.message ?? ""}`);
        return "failed";
      }
    },

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
