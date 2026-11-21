/**
 * An in-process stand-in for a Supabase project: just enough of the Auth,
 * REST and Storage HTTP APIs for supabase-js in a browser and for
 * `src/supabase-accounts.ts`. State lives in memory.
 *
 * It enforces the same rules the real project does through its settings and
 * `supabase/migrations/` (own-row inserts, permanent unique usernames,
 * own-folder avatar uploads), so tests that pass here describe behaviour the
 * real project is expected to have. It is not a substitute for the manual
 * check against the real project described in docs/supabase-setup.md.
 *
 * Run as a script (`tsx apps/ws-server/test/fake-supabase.ts`, port from
 * PORT) for the browser suite.
 */
import { createServer, type IncomingMessage, type ServerResponse } from "http";
import type { AddressInfo } from "net";
import { SignJWT, exportJWK, generateKeyPair, jwtVerify } from "jose";
import { USERNAME_PATTERN } from "../src/account-rules.js";

interface User {
  id: string;
  email: string;
  password: string | null;
  providers: string[];
  metadata: Record<string, unknown>;
  createdAt: string;
}

interface ProfileRow {
  id: string;
  username: string;
  avatar_url: string;
  created_at: string;
}

const MIN_PASSWORD_LENGTH = 8;
/** A 1×1 PNG, used as the avatar of users created through `addUser`. */
const PIXEL = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

export async function startFakeSupabase({ port = 0 } = {}) {
  const { publicKey, privateKey } = await generateKeyPair("ES256");
  const other = await generateKeyPair("ES256");
  const jwk = { ...(await exportJWK(publicKey)), kid: "fake", alg: "ES256" };

  const users = new Map<string, User>();
  const profiles = new Map<string, ProfileRow>();
  const files = new Map<string, Buffer>();
  const refreshTokens = new Map<string, string>();
  const authCodes = new Map<string, string>();
  let restDelayMs = 0;
  let url = "";

  function signToken(
    claims: Record<string, unknown>,
    opts: { expiresIn?: string; wrongKey?: boolean } = {},
  ) {
    return new SignJWT({ role: "authenticated", ...claims })
      .setProtectedHeader({ alg: "ES256", kid: "fake" })
      .setIssuer((claims.iss as string) ?? `${url}/auth/v1`)
      .setAudience((claims.aud as string) ?? "authenticated")
      .setIssuedAt()
      .setExpirationTime(opts.expiresIn ?? "1h")
      .sign(opts.wrongKey ? other.privateKey : privateKey);
  }

  const userJson = (u: User) => ({
    id: u.id,
    aud: "authenticated",
    role: "authenticated",
    email: u.email,
    email_confirmed_at: u.createdAt,
    app_metadata: { provider: u.providers[0], providers: u.providers },
    user_metadata: u.metadata,
    identities: u.providers.map((provider) => ({
      id: `${u.id}-${provider}`,
      user_id: u.id,
      provider,
    })),
    created_at: u.createdAt,
    updated_at: u.createdAt,
  });

  async function session(u: User) {
    const refresh = crypto.randomUUID();
    refreshTokens.set(refresh, u.id);
    return {
      access_token: await signToken({ sub: u.id, email: u.email }),
      token_type: "bearer",
      expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      refresh_token: refresh,
      user: userJson(u),
    };
  }

  function newUser(email: string, password: string | null, provider: string) {
    const u: User = {
      id: crypto.randomUUID(),
      email,
      password,
      providers: [provider],
      metadata: {},
      createdAt: new Date().toISOString(),
    };
    users.set(u.id, u);
    return u;
  }

  const byEmail = (email: string) =>
    [...users.values()].find((u) => u.email === email.trim().toLowerCase());

  const avatarUrl = (path: string) =>
    `${url}/storage/v1/object/public/avatars/${path}`;

  /** The user behind a request's bearer token, verified the cheap way: we signed it. */
  async function caller(req: IncomingMessage): Promise<User | null> {
    const token = (req.headers.authorization ?? "").replace(/^Bearer /, "");
    try {
      const { payload } = await jwtVerify(token, publicKey);
      return users.get(payload.sub ?? "") ?? null;
    } catch {
      return null;
    }
  }

  function send(
    res: ServerResponse,
    status: number,
    body?: unknown,
    headers: Record<string, string> = {},
  ) {
    const raw =
      body === undefined || Buffer.isBuffer(body) ? body : JSON.stringify(body);
    res.writeHead(status, {
      "content-type": "application/json",
      ...headers,
    });
    res.end(raw);
  }

  const authError = (
    res: ServerResponse,
    status: number,
    code: string,
    msg: string,
  ) => send(res, status, { code: status, error_code: code, msg });

  async function readBody(req: IncomingMessage): Promise<Buffer> {
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(chunk as Buffer);
    return Buffer.concat(chunks);
  }

  async function auth(
    req: IncomingMessage,
    res: ServerResponse,
    path: string,
    query: URLSearchParams,
  ) {
    if (path === "/.well-known/jwks.json")
      return send(res, 200, { keys: [jwk] });

    // Stands in for Google's consent screen: straight back with a code.
    if (path === "/authorize" && req.method === "GET") {
      const email = query.get("login_hint") ?? "google-user@test.example";
      const u = byEmail(email) ?? newUser(email, null, "google");
      if (!u.providers.includes("google")) u.providers.push("google");
      const code = crypto.randomUUID();
      authCodes.set(code, u.id);
      const back = new URL(query.get("redirect_to") ?? "http://localhost/");
      back.searchParams.set("code", code);
      res.writeHead(302, { location: back.toString() });
      return res.end();
    }

    const body =
      req.method === "POST" || req.method === "PUT"
        ? JSON.parse((await readBody(req)).toString() || "{}")
        : {};

    if (path === "/signup" && req.method === "POST") {
      const email = String(body.email ?? "")
        .trim()
        .toLowerCase();
      if (String(body.password ?? "").length < MIN_PASSWORD_LENGTH)
        return authError(res, 422, "weak_password", "Password is too short");
      if (byEmail(email))
        return authError(
          res,
          422,
          "user_already_exists",
          "User already registered",
        );
      const u = newUser(email, body.password, "email");
      u.metadata = body.data ?? {};
      return send(res, 200, await session(u));
    }

    if (path === "/token" && req.method === "POST") {
      const grant = query.get("grant_type");
      let u: User | undefined;
      if (grant === "password") {
        u = byEmail(String(body.email ?? ""));
        if (!u || u.password === null || u.password !== body.password)
          u = undefined;
      } else if (grant === "refresh_token") {
        u = users.get(refreshTokens.get(body.refresh_token) ?? "");
      } else if (grant === "pkce") {
        u = users.get(authCodes.get(body.auth_code) ?? "");
        authCodes.delete(body.auth_code);
      }
      if (!u)
        return authError(
          res,
          400,
          "invalid_credentials",
          "Invalid login credentials",
        );
      return send(res, 200, await session(u));
    }

    const me = await caller(req);
    if (path === "/logout") return send(res, 204);
    if (!me) return authError(res, 401, "bad_jwt", "Invalid token");

    if (path === "/user" && req.method === "GET")
      return send(res, 200, userJson(me));
    if (path === "/user" && req.method === "PUT") {
      if (typeof body.password === "string") {
        if (body.password.length < MIN_PASSWORD_LENGTH)
          return authError(res, 422, "weak_password", "Password is too short");
        me.password = body.password;
        if (!me.providers.includes("email")) me.providers.push("email");
      }
      if (body.data) me.metadata = { ...me.metadata, ...body.data };
      return send(res, 200, userJson(me));
    }
    return send(res, 404, { msg: "not found" });
  }

  /** PostgREST-style error body. */
  const dbError = (
    res: ServerResponse,
    status: number,
    code: string,
    message: string,
  ) => send(res, status, { code, message, details: null, hint: null });

  async function rest(
    req: IncomingMessage,
    res: ServerResponse,
    path: string,
    query: URLSearchParams,
  ) {
    if (restDelayMs) await new Promise((r) => setTimeout(r, restDelayMs));
    if (path !== "/profiles") return send(res, 404, { message: "not found" });

    const idFilter = query.get("id")?.replace(/^eq\./, "");
    if (req.method === "GET") {
      // `ilike` with every wildcard escaped is a case-insensitive equality.
      const name = query
        .get("username")
        ?.replace(/^ilike\./, "")
        .replace(/\\(.)/g, "$1")
        .toLowerCase();
      const rows = [...profiles.values()].filter(
        (p) =>
          (idFilter === undefined || p.id === idFilter) &&
          (name === undefined || p.username.toLowerCase() === name),
      );
      return send(res, 200, rows);
    }

    const me = await caller(req);
    if (!me) return dbError(res, 401, "PGRST301", "JWT invalid");
    const parsed = JSON.parse((await readBody(req)).toString() || "{}");
    const row = Array.isArray(parsed) ? parsed[0] : parsed;

    if (req.method === "POST") {
      if (row.id !== me.id)
        return dbError(res, 403, "42501", "row-level security violation");
      if (
        typeof row.username !== "string" ||
        !USERNAME_PATTERN.test(row.username)
      )
        return dbError(res, 400, "23514", "check constraint violation");
      if (typeof row.avatar_url !== "string")
        return dbError(res, 400, "23502", "null value in avatar_url");
      const taken = [...profiles.values()].some(
        (p) =>
          p.id === me.id ||
          p.username.toLowerCase() === row.username.toLowerCase(),
      );
      if (taken)
        return dbError(
          res,
          409,
          "23505",
          "duplicate key value violates unique constraint",
        );
      profiles.set(me.id, {
        id: me.id,
        username: row.username,
        avatar_url: row.avatar_url,
        created_at: new Date().toISOString(),
      });
      return send(res, 201);
    }

    if (req.method === "PATCH") {
      // Only `avatar_url` is updatable, and only on one's own row.
      if (Object.keys(row).some((k) => k !== "avatar_url"))
        return dbError(
          res,
          403,
          "42501",
          "permission denied for table profiles",
        );
      const mine = profiles.get(me.id);
      if (mine && (idFilter === undefined || idFilter === me.id))
        mine.avatar_url = String(row.avatar_url);
      return send(res, 204);
    }
    return send(res, 405, { message: "method not allowed" });
  }

  async function storage(
    req: IncomingMessage,
    res: ServerResponse,
    path: string,
  ) {
    const pub = path.match(/^\/object\/public\/avatars\/(.+)$/);
    if (pub && req.method === "GET") {
      const file = files.get(pub[1]);
      if (!file) return send(res, 404, { message: "not found" });
      return send(res, 200, file, { "content-type": "image/png" });
    }

    const upload = path.match(/^\/object\/avatars\/([^/]+)\/([^/]+)$/);
    if (upload && req.method === "POST") {
      const me = await caller(req);
      if (!me || upload[1] !== me.id)
        return send(res, 403, {
          statusCode: "403",
          error: "Unauthorized",
          message: "new row violates row-level security policy",
        });
      const key = `${upload[1]}/${upload[2]}`;
      files.set(key, await readBody(req));
      return send(res, 200, { Id: crypto.randomUUID(), Key: `avatars/${key}` });
    }
    return send(res, 404, { message: "not found" });
  }

  const server = createServer(async (req, res) => {
    res.setHeader("access-control-allow-origin", "*");
    res.setHeader(
      "access-control-allow-headers",
      req.headers["access-control-request-headers"] ?? "*",
    );
    res.setHeader("access-control-allow-methods", "GET,POST,PUT,PATCH,DELETE");
    res.setHeader("access-control-expose-headers", "content-range");
    if (req.method === "OPTIONS") {
      res.writeHead(204);
      return res.end();
    }

    try {
      const { pathname, searchParams } = new URL(req.url ?? "/", url);
      if (pathname.startsWith("/auth/v1"))
        return await auth(req, res, pathname.slice(8), searchParams);
      if (pathname.startsWith("/rest/v1"))
        return await rest(req, res, pathname.slice(8), searchParams);
      if (pathname.startsWith("/storage/v1"))
        return await storage(req, res, pathname.slice(11));
      // Readiness probe for Playwright's webServer.
      return send(res, 200, { ok: true });
    } catch (err) {
      return send(res, 500, { message: String(err) });
    }
  });

  await new Promise<void>((resolve) => server.listen(port, resolve));
  url = `http://localhost:${(server.address() as AddressInfo).port}`;

  return {
    url,
    /**
     * Creates an e-mail account (`<username lower>@test.example`) and, unless
     * `avatar` is false, its finished profile.
     */
    async addUser(username: string, password: string, avatar = true) {
      const u = newUser(
        `${username.toLowerCase()}@test.example`,
        password,
        "email",
      );
      if (avatar) {
        const path = `${u.id}/1.png`;
        files.set(path, PIXEL);
        profiles.set(u.id, {
          id: u.id,
          username,
          avatar_url: avatarUrl(path),
          created_at: u.createdAt,
        });
      }
      return {
        userId: u.id,
        accessToken: await signToken({ sub: u.id, email: u.email }),
      };
    },
    /** Overwrites (or removes) a profile row, bypassing every rule. */
    setProfile(
      userId: string,
      row: { username: string; avatar_url: string } | null,
    ) {
      if (!row) profiles.delete(userId);
      else
        profiles.set(userId, {
          id: userId,
          created_at: new Date().toISOString(),
          ...row,
        });
    },
    /** Makes every `/rest/v1` answer take this long. */
    delayRest(ms: number) {
      restDelayMs = ms;
    },
    signToken,
    async stop() {
      server.closeAllConnections();
      await new Promise((resolve) => server.close(resolve));
    },
  };
}

// Run directly (the browser suite does): listen on PORT.
if (require.main === module) {
  void startFakeSupabase({ port: Number(process.env.PORT) || 8090 }).then(
    (fake) => console.log(`[fake-supabase] listening on ${fake.url}`),
  );
}
