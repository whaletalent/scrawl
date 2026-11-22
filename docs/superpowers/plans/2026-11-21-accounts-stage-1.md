# Accounts (stage 1 of 3) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Players can create an account (e-mail + password or Google, then a username and a self-drawn avatar), sign in and out, manage a profile, and show up in rooms with their username and avatar — while guests keep playing exactly as today.

**Architecture:** The static site talks to Supabase directly (Auth, `profiles` table, `avatars` bucket) through one wrapper module. The game server learns who a player is from an optional access token on `create-room` / `join-room`, verified through a small `Accounts` interface that tests replace with a fake. With no Supabase configured, accounts are off on both sides and nothing changes.

**Tech Stack:** `@supabase/supabase-js` (web), `jose` (server, JWT verification), Supabase Auth + Postgres + Storage, existing `node:test` and Playwright suites.

**Spec:** `docs/superpowers/specs/2026-11-21-accounts-profile-home-design.md` — read it first. This plan covers its build-order stage 1 only. Stages 2 (home, public rooms) and 3 (gallery) get their own plans after this lands.

## Global Constraints

- An account is never required to play. Guest flows (landing nickname, invite link, private rooms) behave exactly as today; the 27 server tests and 13 browser tests that exist must pass unmodified, except where a helper's signature is extended.
- Accounts are **off** when Supabase isn't configured: web needs `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`; server needs `SUPABASE_URL` + `SUPABASE_SECRET_KEY`. Off means: no login button, everyone is a guest, no errors.
- Username: 3–16 characters; letters, digits, `_` and `.`; unique ignoring case; displayed as typed; cannot be changed.
- Sign-in: e-mail + password (Supabase "Confirm email" off) and Google (PKCE redirect). The username is the public name chosen in onboarding, not the login.
- Password: at least 8 characters; typed twice at sign-up; can be changed from the profile; no recovery and no e-mail is ever sent.
- A player's e-mail address is never shown to others: not in `profiles`, not in any room message.
- Onboarding (username, then avatar) is required before the home; the profile row is created once, with both. Avatar: 256×256 PNG; an untouched template is valid.
- Never in the web bundle: the Supabase secret key. Never broadcast to a room: access token, `userId`, e-mail, session token.
- Neither test suite may reach a real Supabase project or the network.
- Static export under a base path: no server routes, no dynamic segments; every new page is a folder with `page.tsx` (`trailingSlash: true`); build links with `<Link>` / `router.push` or the helpers in `lib/routes.ts`.
- `apps/ws-server` local imports end in `.js`. The protocol is mirrored in `apps/ws-server/src/types.ts` and `apps/web/src/types/game.ts`.
- UI copy in pt-BR, in the tone of the existing screens; code, comments, docs and commits in English.
- Commit as the repo's configured identity; work on branch `feat/accounts`; run `npm run lint && npm run format:check && npm run typecheck && npm test` before each commit.
- Check Supabase specifics (key names, JWKS verification, storage policies, client options) against the current docs, not memory.

## Review Focus

1. **Supabase slow or down when someone joins a room** → the player joins as a guest within 3 seconds; the room never hangs. (Task 3)
2. **A second `join-room`/`create-room`, or the socket closing, while the token is still being verified** → exactly one player, or none; no ghost slot, no second room. (Task 2)
3. **A profile row is written by the browser, so its contents are attacker-controlled** → the server only accepts an `avatar_url` under this project's `avatars/<userId>/` public path and a username that passes the rules; otherwise the player is a guest. The database lets a user insert only their own row and never change its username. (Tasks 3, 4)
4. **Onboarding abandoned after sign-up, or a first Google sign-in closed half-way** → the next sign-in of that account lands on onboarding, not on a broken home, from any page. (Tasks 7, 9)
5. **`Ana` exists and someone registers `ana`; or an e-mail that already has an account signs up again** → refused with "Esse username já existe" / "Esse e-mail já tem conta", at the live check and at submit. (Task 3 fake enforces it, Task 9 tests it)

---

## File Structure

```
apps/ws-server/src/
  accounts.ts            Accounts interface, Profile type, setAccounts/getAccounts   (new)
  supabase-accounts.ts   Accounts backed by Supabase: JWKS verify + profile fetch     (new)
  account-rules.ts       username rule + avatar URL check, shared by server code      (new)
  handlers.ts            async create/join with identity
  room-manager.ts        Player.userId / avatarUrl, publicPlayer
  game-engine.ts         playerAvatars on party results
  server.ts              wires Supabase accounts from env
apps/ws-server/test/
  fake-supabase.ts       in-process fake of the Supabase HTTP API (auth, rest, storage, jwks)  (new)
  identity.test.ts, supabase-accounts.test.ts                                         (new)
apps/web/src/
  lib/account-rules.ts   validateUsername, validatePassword, validateEmail           (new)
  lib/supabase.ts        client or null                                               (new)
  lib/account.ts         every Supabase call the site makes                           (new)
  lib/avatar.ts          composeAvatar                                                (new)
  hooks/use-account.ts   session + profile state                                      (new)
  components/account/    avatar.tsx, account-menu.tsx, auth-form.tsx, avatar-editor.tsx  (new)
  app/login/ app/welcome/ app/avatar/ app/profile/   pages                                         (new)
  hooks/use-face-canvas.ts, components/canvas/face-canvas.tsx   free mode
  components/landing/hero.tsx, app/room/room-client.tsx, hooks/use-game-state.ts,
  components/lobby/lobby.tsx, components/game/scoreboard.tsx,
  components/phases/{split-reveal,face-reveal}.tsx, components/share/share-card.tsx
apps/web/test/           account-rules.test.ts                                        (new)
supabase/migrations/     0001_accounts.sql                                            (new)
docs/supabase-setup.md   owner's manual steps                                         (new)
.github/workflows/       supabase-keepalive.yml (new), deploy.yml
e2e/                     account.spec.ts (new), helpers.ts, playwright.config.ts
```

---

### Task 1: Account rules

**Files:**

- Create: `apps/web/src/lib/account-rules.ts`, `apps/web/test/account-rules.test.ts`, `apps/ws-server/src/account-rules.ts`
- Modify: `apps/web/package.json` (script `"test": "tsx --test --test-reporter=spec test/*.test.ts"`, devDependency `tsx`), root `package.json` (`"test": "npm test --workspaces --if-present"`), root `typecheck` if the web test dir needs including

**Interfaces — Produces:**

```ts
// apps/web/src/lib/account-rules.ts  (no imports, so node:test can load it)
export const USERNAME_PATTERN = /^[A-Za-z0-9_.]{3,16}$/;
export const MIN_PASSWORD_LENGTH = 8;
export function validateUsername(username: string): string | null; // pt-BR message or null
export function validatePassword(password: string, confirmation: string): string | null;
export function validateEmail(email: string): string | null; // shape only: something@something.tld, max 254 chars
// apps/ws-server/src/account-rules.ts
export const USERNAME_PATTERN: RegExp; // same pattern
export function isOwnAvatarUrl(url: unknown, supabaseUrl: string, userId: string): url is string;
```

- [ ] **Step 1: Write the failing tests** in `apps/web/test/account-rules.test.ts`:

```ts
test("username rules", () => {
  for (const ok of ["ana", "Ana_99", "a.b", "abcdefghijklmnop"])
    assert.equal(validateUsername(ok), null);
  for (const bad of ["ab", "abcdefghijklmnopq", "ana maria", "ana@x", "aná", ""])
    assert.equal(typeof validateUsername(bad), "string");
});
test("password rules", () => {
  assert.equal(validatePassword("12345678", "12345678"), null);
  assert.match(validatePassword("1234567", "1234567")!, /8/);
  assert.equal(typeof validatePassword("12345678", "12345679"), "string");
});
test("e-mail shape", () => {
  for (const ok of ["ana@example.com", " Ana.B+x@mail.example.org "])
    assert.equal(validateEmail(ok), null);
  for (const bad of ["", "ana", "ana@", "@x.com", "ana@x", "a b@x.com"])
    assert.equal(typeof validateEmail(bad), "string");
});
```

Add to `apps/ws-server/test/` (new `account-rules.test.ts`):

```ts
test("only this project's avatars/<userId>/ URLs are accepted", () => {
  const base = "https://p.supabase.co";
  const own = `${base}/storage/v1/object/public/avatars/u1/123.png`;
  assert.equal(isOwnAvatarUrl(own, base, "u1"), true);
  for (const bad of [
    `${base}/storage/v1/object/public/avatars/u2/123.png`,
    `https://evil.example/storage/v1/object/public/avatars/u1/x.png`,
    `${base}/storage/v1/object/public/avatars/u1/../u2/x.png`,
    "javascript:alert(1)", null, 42,
  ]) assert.equal(isOwnAvatarUrl(bad, base, "u1"), false);
});
```

- [ ] **Step 2: Run** `npm test` — expect the new tests to fail on missing modules.
- [ ] **Step 3: Implement** both modules with the signatures above.
- [ ] **Step 4: Run** `npm test` — all pass (27 existing + new).
- [ ] **Step 5: Commit** `feat: account rules for usernames, passwords, e-mails and avatar URLs`

---

### Task 2: Identity inside a room (server)

**Files:**
- Create: `apps/ws-server/src/accounts.ts`, `apps/ws-server/test/identity.test.ts`
- Modify: `apps/ws-server/src/types.ts`, `room-manager.ts`, `handlers.ts`, `game-engine.ts`, `apps/ws-server/test/server.ts`, `apps/ws-server/test/client.ts`

**Interfaces — Produces:**

```ts
// accounts.ts
export interface Profile { userId: string; username: string; avatarUrl: string }
export interface Accounts {
  /** Resolves null for anything that isn't a valid, complete account. Never rejects. */
  profileFromToken(accessToken: string): Promise<Profile | null>;
}
export function setAccounts(accounts: Accounts | null): void; // null = accounts off (default)
export function getAccounts(): Accounts | null;

// types.ts
interface Player { /* + */ userId: string | null; avatarUrl: string | null }
type ClientMessage =
  | { type: "join-room"; roomCode: string; nickname: string; accessToken?: string }
  | { type: "create-room"; /* existing fields */ accessToken?: string } | ...
interface DrawingResult { /* + */ playerAvatars: [string | null, string | null] }

// room-manager.ts — identity is an optional last argument
export function createRoom(nickname, ws, requestedMode?, totalRounds?, turnDuration?, faceTemplate?, skinTone?, profile?: Profile | null): Room;
export function joinRoom(code, nickname, ws, profile?: Profile | null): { room; playerId } | null;
// publicPlayer adds `avatarUrl` only when the player has one

// test/server.ts
startServer({ timeScale?, graceMs?, accounts?: Accounts | null })   // calls setAccounts; stop() resets it to null
// test/client.ts — createRoom/join helpers accept an optional accessToken
```

Behaviour: when a profile resolves, the player's `nickname` is the profile's username (the nickname sent is ignored), `userId` and `avatarUrl` are set. `handleCreateRoom` / `handleJoinRoom` become async: they await `profileFromToken` only when `getAccounts()` is non-null and `accessToken` is a non-empty string. While that await is pending the socket is marked (a `WeakSet<WebSocket>`); further `create-room`/`join-room` from the same socket are ignored. After the await, do nothing if the socket is no longer open or is already in `wsToPlayer`.

- [ ] **Step 1: Write the failing tests** in `identity.test.ts`, with a fake:

```ts
const fake: Accounts = {
  async profileFromToken(t) {
    if (t === "slow") await sleep(300);
    return t === "tok-ana" || t === "slow"
      ? { userId: "u-ana", username: "Ana_99", avatarUrl: "https://x/avatars/u-ana/1.png" }
      : null;
  },
};
```

  - `a valid token makes the player show up with the account's username and avatar` — host creates with `nickname: "whatever", accessToken: "tok-ana"`; `room-state.state.players[0]` has `nickname === "Ana_99"` and `avatarUrl` ending `/u-ana/1.png`; a second client joining receives the same in `room-state`, and the host's `player-joined` for a guest has no `avatarUrl` key.
  - `an unknown token joins as a guest with the nickname sent` — `accessToken: "nope", nickname: "Bia"` → `nickname === "Bia"`, no `avatarUrl`.
  - `userId and tokens are never sent` — `JSON.stringify` of every message every client received contains neither `"u-ana"` nor `"userId"` nor `"tok-ana"`; only the owner's own `room-state` contains a `sessionToken`.
  - `with accounts off a token is ignored` — `startServer({ accounts: null })`, create with `accessToken: "tok-ana", nickname: "Bia"` → `"Bia"`.
  - `a second join while the token is being verified is ignored` — send `join-room` with `accessToken: "slow"` twice in a row; after 500 ms the room has exactly 2 players (host + one).
  - `closing the socket while the token is being verified leaves no ghost` — send `create-room` with `"slow"`, close immediately, wait 500 ms; a fresh client's `join-room` to any code fails normally and the server has not thrown (a follow-up create works).
  - `party results carry the authors' avatars` — in a 4-player party game with one logged-in player, a `final-results` drawing has `playerAvatars` with that URL in the position matching `playerNames`, `null` for guests.
  - `rejoin keeps the identity` — logged-in player reconnects with the session token; `room-state` still shows username and avatar.

- [ ] **Step 2: Run** `cd apps/ws-server && npx tsx --test --test-reporter=spec test/identity.test.ts` — fails.
- [ ] **Step 3: Implement** per the Interfaces block. `playerAvatars` is filled where `playerNames` is filled in `game-engine.ts`.
- [ ] **Step 4: Run** `npm test` — everything passes, old tests untouched.
- [ ] **Step 5: Commit** `feat(server): players joined with an account carry username and avatar`

---

### Task 3: Fake Supabase and the Supabase-backed `Accounts`

**Files:**
- Create: `apps/ws-server/test/fake-supabase.ts`, `apps/ws-server/src/supabase-accounts.ts`, `apps/ws-server/test/supabase-accounts.test.ts`
- Modify: `apps/ws-server/src/server.ts`, `apps/ws-server/package.json` (dependency `jose`), `apps/ws-server/Dockerfile` only if it lists files explicitly

**Interfaces — Produces:**

```ts
// supabase-accounts.ts
export function createSupabaseAccounts(opts: { url: string; secretKey: string; timeoutMs?: number /* 3000 */ }): Accounts;

// test/fake-supabase.ts — one in-process HTTP server that speaks enough of the Supabase API
// for supabase-js in a browser and for supabase-accounts.ts. Also runnable as a script
// (`tsx apps/ws-server/test/fake-supabase.ts`, port from PORT) for the browser suite.
export async function startFakeSupabase(opts?: { port?: number }): Promise<{
  url: string;
  /** Test controls */
  addUser(username: string, password: string, avatar?: boolean): Promise<{ userId: string; accessToken: string }>; // e-mail is `<username lower>@test.example`
  setProfile(userId: string, row: { username: string; avatar_url: string } | null): void;
  delayRest(ms: number): void;         // makes /rest/v1 answers slow
  signToken(claims: object, opts?: { expiresIn?: string; wrongKey?: boolean }): Promise<string>;
  stop(): Promise<void>;
}>;
```

Fake endpoints (permissive CORS on all, in-memory state, ES256 key pair generated at start with `jose`):
`GET /auth/v1/.well-known/jwks.json`; `POST /auth/v1/signup`; `POST /auth/v1/token?grant_type=password|refresh_token|pkce`; `GET /auth/v1/authorize?provider=google` (stands in for Google: redirects straight back to `redirect_to` with a `code` for the e-mail given in a `login_hint` query parameter, default `google-user@test.example`, creating that user on first use); `GET|PUT /auth/v1/user`; `POST /auth/v1/logout`; `GET|POST|PATCH /rest/v1/profiles` (filters `id=eq.`, `username=ilike.`; `POST` enforces that `id` is the caller, the username pattern, and case-insensitive uniqueness with the Postgres `23505` error body; `PATCH` may change only `avatar_url`); sign-up with an e-mail that exists answers the way Supabase does with confirmation off; `POST /storage/v1/object/avatars/<userId>/<file>` (caller must own the folder); `GET /storage/v1/object/public/avatars/...`. Tokens: issuer `<url>/auth/v1`, audience `authenticated`, `sub` = user id, 1 h expiry. Response shapes follow what the current supabase-js version expects — confirm against its docs/source rather than guessing.

`createSupabaseAccounts`: verify the token with `jose` (`createRemoteJWKSet` on `<url>/auth/v1/.well-known/jwks.json`, issuer and audience as above); fetch `GET <url>/rest/v1/profiles?id=eq.<sub>&select=username,avatar_url` with the secret key; return a `Profile` only if a row exists, `username` matches `USERNAME_PATTERN` and `isOwnAvatarUrl(avatar_url, url, sub)`. Any failure, and anything slower than `timeoutMs` in total, resolves `null`.

`server.ts`: if both `SUPABASE_URL` and `SUPABASE_SECRET_KEY` are set, `setAccounts(createSupabaseAccounts(...))` and log one line saying accounts are on; otherwise log that they're off.

- [ ] **Step 1: Write the failing tests** in `supabase-accounts.test.ts` against `startFakeSupabase()`:
  - `a signed-up user with an avatar resolves to their profile` — `addUser("Ana_99", "12345678", true)` → `{ userId, username: "Ana_99", avatarUrl }`.
  - `no profile row yet resolves null` (user added with `avatar: false`).
  - `expired token`, `token signed with another key`, `garbage string`, `wrong audience` → each `null`.
  - `a profile pointing at someone else's or an outside avatar URL resolves null` — `setProfile(userId, { username: "Ana_99", avatar_url: "https://evil.example/a.png" })`.
  - `a profile with a username that breaks the rules resolves null` — `setProfile(userId, { username: "<b>x</b>", avatar_url: own })`.
  - `a slow Supabase resolves null within the timeout` — `delayRest(2000)`, `timeoutMs: 200`; the call settles in under 600 ms with `null`.
  - `an unreachable Supabase resolves null` — `url: "http://127.0.0.1:1"`.
  - `end to end: a room joined with a real token shows the account` — `startServer({ accounts: createSupabaseAccounts({ url: fake.url, secretKey: "x" }) })`, create a room with the token from `addUser`; `room-state` has the username and avatar.
- [ ] **Step 2: Run** the file — fails.
- [ ] **Step 3: Implement** the fake, then `createSupabaseAccounts`, then the `server.ts` wiring.
- [ ] **Step 4: Run** `npm test && npm run build:server` — pass.
- [ ] **Step 5: Commit** `feat(server): verify Supabase access tokens and load profiles`

---

### Task 4: Supabase schema, setup guide, deploy wiring

**Files:**
- Create: `supabase/migrations/0001_accounts.sql`, `docs/supabase-setup.md`, `.github/workflows/supabase-keepalive.yml`
- Modify: `.github/workflows/deploy.yml`, `render.yaml`, `README.md`, `CLAUDE.md`, `.prettierignore` if SQL needs excluding

No automated test: this task is reviewed by reading, and proven by the checklist in Task 9.

- [ ] **Step 1: Write `0001_accounts.sql`** — idempotent where practical:
  - `profiles (id uuid primary key references auth.users on delete cascade, username text not null check (username ~ '^[A-Za-z0-9_.]{3,16}$'), avatar_url text not null, created_at timestamptz not null default now())`, unique index on `lower(username)`.
  - RLS on. `select`: everyone (anon and authenticated). `insert`: `auth.uid() = id`. `update`: own row; column privileges restricted so only `avatar_url` can be updated by `authenticated` (revoke table-level update, grant `update (avatar_url)`), which is what makes the username permanent. No delete. The table has no e-mail column.
  - A check, as constraint or in both write policies, that `avatar_url` starts with the project's public `avatars/<id>/` path is desirable; if the project URL can't be referenced cleanly from SQL, leave it to the server check from Task 3 and say so in a comment.
  - Bucket `avatars`: public, 200 KB file size limit, `image/png` only. Storage policies: authenticated users may insert objects in `avatars` only when the first folder of the name equals `auth.uid()::text`; public read. No update/delete from clients.
- [ ] **Step 2: Write `docs/supabase-setup.md`** — the owner's steps, in order: create the project; Auth settings: e-mail provider on, **Confirm email off**, minimum password length 8, secure password change off; create a Google OAuth client (Google Cloud console) and enable the Google provider with its id and secret; add the site URL and redirect URLs (`https://whaletalent.github.io/scrawl/**`, `http://localhost:3000/**`); run the SQL; copy project URL + publishable key into repository variables `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`; put `SUPABASE_URL` + `SUPABASE_SECRET_KEY` in the Render service environment; re-run the deploy workflow. Include the first-run check from Task 9 step 5 and how to reset a player's password / delete an account or avatar from the dashboard, what Supabase does when a Google sign-in uses an address that already has an unconfirmed e-mail account (the spec's known limitation — verify and write down the actual behaviour), and how to turn on confirmation and recovery later (custom SMTP). Say plainly that the secret key goes only into Render.
- [ ] **Step 3: `deploy.yml`** passes `NEXT_PUBLIC_SUPABASE_URL: ${{ vars.SUPABASE_URL }}` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: ${{ vars.SUPABASE_PUBLISHABLE_KEY }}` to the build (empty when unset → accounts off). `render.yaml` lists the two server variables with `sync: false`.
- [ ] **Step 4: `supabase-keepalive.yml`** — `schedule` once a day plus `workflow_dispatch`; one `curl` of `${{ vars.SUPABASE_URL }}/rest/v1/profiles?select=id&limit=1` with the publishable key as `apikey`; the job is skipped when `vars.SUPABASE_URL` is empty; fails on a non-2xx so the owner gets GitHub's failure e-mail.
- [ ] **Step 5: README and CLAUDE.md** — an "Accounts" section each: what is stored where, the four variables, accounts-off behaviour, the `Accounts` interface and fake Supabase for tests.
- [ ] **Step 6: Run** `npm run lint && npm run format:check`; commit `feat: Supabase schema, setup guide and deploy wiring for accounts`

---

### Task 5: Web account layer

**Files:**

- Create: `apps/web/src/lib/supabase.ts`, `apps/web/src/lib/account.ts`, `apps/web/src/hooks/use-account.ts`
- Modify: `apps/web/package.json` (dependency `@supabase/supabase-js`)

**Interfaces — Produces:**

```ts
// lib/supabase.ts
export const supabase: SupabaseClient | null; // null when either NEXT_PUBLIC_SUPABASE_* is empty; PKCE flow, session detected in the URL
export const ACCOUNTS_ENABLED: boolean;

// lib/account.ts — the only file besides supabase.ts that imports supabase-js
export interface Profile { userId: string; username: string; avatarUrl: string }
export type AccountError =
  | "email-taken" | "username-taken" | "invalid-credentials" | "weak-password" | "network" | "unknown";
export async function signUpWithEmail(email: string, password: string): Promise<AccountError | null>;
export async function signInWithEmail(email: string, password: string): Promise<AccountError | null>;
export async function signInWithGoogle(): Promise<AccountError | null>; // navigates away; comes back to `${origin}${BASE_PATH}/`
export async function signOut(): Promise<void>;
export async function isUsernameTaken(username: string): Promise<boolean>; // case-insensitive
export async function createProfile(username: string, avatarPng: Blob): Promise<AccountError | null>; // uploads, then inserts the row
export async function saveAvatar(avatarPng: Blob): Promise<AccountError | null>; // uploads avatars/<uid>/<Date.now()>.png, updates avatar_url
export async function changePassword(newPassword: string): Promise<AccountError | null>;
export async function hasPassword(): Promise<boolean>; // false for Google-only accounts
export async function getAccessToken(): Promise<string | null>; // fresh token; null when signed out or accounts off
export function accountErrorMessage(e: AccountError): string; // pt-BR

// hooks/use-account.ts
export type AccountStatus = "off" | "loading" | "signed-out" | "needs-profile" | "ready";
export function useAccount(): { status: AccountStatus; profile: Profile | null; refresh(): Promise<void> };
```

Decisions: `status` is `"needs-profile"` when there is a session but no `profiles` row. A unique-violation on the profile insert maps to `"username-taken"`; Supabase's "user already registered" on sign-up maps to `"email-taken"`. The hook subscribes to `onAuthStateChange` and shares one state across components (module-level store or a provider in `layout.tsx` — builder's choice). Messages: `email-taken` → "Esse e-mail já tem conta"; `username-taken` → "Esse username já existe"; `invalid-credentials` → "E-mail ou senha incorretos". Nothing in this layer exposes the e-mail to other modules except the signed-in user's own, for display on their profile.

- [ ] **Step 1: Implement** the three modules. There is no unit test here: this layer is exercised end to end in Task 9 against the fake Supabase, which is the test that proves it.
- [ ] **Step 2: Run** `npm run typecheck && npm run build` with the env vars unset — build succeeds, `supabase` is null, and `grep -r "SECRET" apps/web/out` finds nothing.
- [ ] **Step 3: Commit** `feat(web): account layer over Supabase`

---

### Task 6: Free-draw avatar canvas

**Files:**
- Create: `apps/web/src/lib/avatar.ts`, `apps/web/src/components/account/avatar-editor.tsx`
- Modify: `apps/web/src/hooks/use-face-canvas.ts`, `apps/web/src/components/canvas/face-canvas.tsx`
- Test: `e2e/face-builder.spec.ts` must keep passing unmodified; new coverage arrives in Task 9

**Interfaces — Produces:**

```ts
// use-face-canvas.ts
export function useFaceCanvas(assignedRegionIds: FaceRegionId[], opts?: { free?: boolean });
// face-canvas.tsx
interface FaceCanvasProps { assignedRegions: FaceRegionId[]; faceTemplate: FaceTemplateId; skinTone: string; free?: boolean }
// lib/avatar.ts
export const AVATAR_SIZE = 256;
/** White background + template in `skinTone` + the transparent drawing, cropped to the 600×600 square centred on the face, scaled to 256×256. */
export async function composeAvatar(drawingDataUrl: string, faceTemplate: FaceTemplateId, skinTone: string): Promise<Blob>;
// components/account/avatar-editor.tsx
export function AvatarEditor(props: { onSave: (png: Blob) => Promise<string | null> /* error message */; saveLabel: string }): JSX.Element;
```

Free mode: every tool works anywhere on the 800×600 canvas — strokes, shapes and fill are not clipped to a region and a stroke may start anywhere; the region overlay (dimming, dashed outlines, labels) is not rendered. Region mode is unchanged. `composeAvatar` reuses the template-to-image technique in `phases/face-reveal.tsx` (extract the shared part rather than copying it). The crop is the square `x: 100–700, y: 0–600` (the face ellipse is centred at 400, 280).

`AvatarEditor`: template picker (the five templates, no "Aleatório"; default `masculine`) and skin-tone picker using `FACE_TEMPLATE_LABELS` / `SKIN_TONES` as `mode-selector.tsx` does; `FaceCanvas` in free mode; a save button with `saveLabel` that is disabled while saving and shows the returned error. Changing template or skin tone keeps the drawing.

- [ ] **Step 1: Implement** free mode in the hook and canvas, then `avatar.ts`, then `AvatarEditor`.
- [ ] **Step 2: Run** `npx playwright test e2e/face-builder.spec.ts` — the existing region-clipping tests pass unmodified.
- [ ] **Step 3: Commit** `feat(web): free-draw face canvas and avatar composition`

---

### Task 7: Sign-up, sign-in, onboarding and profile pages

**Files:**

- Create: `apps/web/src/app/login/page.tsx`, `apps/web/src/app/welcome/page.tsx`, `apps/web/src/app/avatar/page.tsx`, `apps/web/src/app/profile/page.tsx`, `apps/web/src/components/account/auth-form.tsx`, `apps/web/src/components/account/avatar.tsx`, `apps/web/src/components/account/account-menu.tsx`
- Modify: `apps/web/src/components/landing/hero.tsx`, `apps/web/src/app/page.tsx`

**Interfaces — Consumes:** Task 1 rules, Task 5 `useAccount` and `lib/account.ts`, Task 6 `AvatarEditor`.
**Produces:**

```tsx
// components/account/avatar.tsx — used by every later screen
export function Avatar(props: { url?: string | null; name: string; size?: number /* px, default 32 */ }): JSX.Element;
// round; with no url, a neutral circle with the name's first letter
```

Routes and guards (all client-side; each page shows a neutral loading state while `status === "loading"`):

| Route | Shows | Redirects |
| --- | --- | --- |
| `/login/` | `AuthForm`: "Entrar com Google" button, then tabs "Entrar" and "Criar conta" | `ready` → `/`; `needs-profile` → `/welcome/`; `off` → `/` |
| `/welcome/` | onboarding: step 1 username, step 2 `AvatarEditor`; "Sair" link | `signed-out`/`off` → `/login/` or `/`; `ready` → `/`; after `createProfile` → `/` |
| `/avatar/` | `AvatarEditor`, title "Redesenhar avatar" | not `ready` → as above; after `saveAvatar` → `/profile/` |
| `/profile/` | avatar (large), username, own e-mail, "Redesenhar avatar" → `/avatar/`, change-password form (only when `hasPassword()`), "Sair" | `signed-out` → `/login/`; `needs-profile` → `/welcome/` |

`AuthForm`:

- "Entrar com Google" → `signInWithGoogle()`.
- "Criar conta": e-mail, password, confirm password; validation messages from Task 1 on blur and on submit; one line under the password fields: "Guarde sua senha: ainda não há como recuperá-la."; submit → `signUpWithEmail` → `/welcome/`.
- "Entrar": e-mail, password → `signInWithEmail` → `/` (the guard sends `needs-profile` accounts to `/welcome/`).

Onboarding step 1: username field with Task 1 validation and a debounced `isUsernameTaken` check ("Esse username já existe"); "Continuar" keeps the username in component state. Step 2: `AvatarEditor` with `saveLabel="Criar conta"`; on `"username-taken"` (lost a race) go back to step 1 with the message, keeping the drawing if practical.

Landing (`Hero` and `page.tsx`), stage-1 scope only — the full logged-in home is stage 2:

- `off`: unchanged, pixel for pixel.
- `signed-out`: unchanged plus a link "Entrar / Criar conta" → `/login/`.
- `needs-profile`: redirect to `/welcome/`. This is also where a Google sign-in returns to, so the first Google sign-in flows straight into onboarding.
- `ready`: `AccountMenu` (avatar + username → `/profile/`, "Sair") at the top; the nickname field is replaced by "Jogando como **username**"; create and join work without typing a nickname (store the username in `scrawl-nickname` so the room page's existing checks pass).

- [ ] **Step 1: Implement** `Avatar`, `AccountMenu`, `AuthForm`, the four pages, then the landing changes.
- [ ] **Step 2: Run** `npm run typecheck && npm run build && npm run test:e2e` — the 13 existing browser tests pass unmodified (accounts are off in that run until Task 9).
- [ ] **Step 3: Commit** `feat(web): sign-up, sign-in, onboarding and profile pages`

---

### Task 8: Accounts inside rooms (web)

**Files:**
- Modify: `apps/web/src/types/game.ts`, `apps/web/src/hooks/use-game-state.ts`, `apps/web/src/app/room/room-client.tsx`, `apps/web/src/components/lobby/lobby.tsx`, `apps/web/src/components/game/scoreboard.tsx`, `apps/web/src/components/phases/split-reveal.tsx`, `apps/web/src/components/phases/face-reveal.tsx`, `apps/web/src/components/share/share-card.tsx`, `apps/web/src/components/game/game-controller.tsx` (pass `players` where a reveal needs them)

**Interfaces — Consumes:** Task 2 protocol (`accessToken`, `Player.avatarUrl`, `DrawingResult.playerAvatars`), Task 5 `getAccessToken` / `useAccount`, Task 7 `Avatar`.
**Produces:** `createRoom(..., accessToken?: string)` and `joinRoom(roomCode, nickname, accessToken?: string)` in `use-game-state.ts`; mirrored types in `types/game.ts`.

Behaviour:
- `room-client.tsx` waits for `useAccount().status !== "loading"` before creating or joining. `ready` → no nickname prompt, sends the username as nickname plus `await getAccessToken()`. `needs-profile` → redirect to `/welcome/`. `signed-out`/`off` → today's flow untouched. Rejoin is unchanged and sends no token.
- `Avatar` next to each name: lobby player list, scoreboard rows, the "A + B" author line of each final party drawing (`playerAvatars`), and the author names in `SplitReveal` / `FaceReveal` (resolve ids against `roomState.players`; a player who left has no avatar → placeholder).
- Share card: draw each author's avatar as a circle beside their name, loading the image with `crossOrigin = "anonymous"`. If an avatar fails to load, or would taint the canvas, render the card name-only as today — the download must never break.

- [ ] **Step 1: Implement.**
- [ ] **Step 2: Run** `npm run typecheck && npm run test:e2e` — existing tests pass unmodified.
- [ ] **Step 3: Commit** `feat(web): usernames and avatars inside rooms`

---

### Task 9: Browser tests for accounts, and the real-project check

**Files:**
- Create: `e2e/account.spec.ts`
- Modify: `playwright.config.ts`, `e2e/helpers.ts`, `.github/workflows/ci.yml` only if a port or env needs declaring, `README.md` (test counts)

Setup: `playwright.config.ts` starts a third server, `npx tsx apps/ws-server/test/fake-supabase.ts` on port 8090, gives the game server `SUPABASE_URL=http://localhost:8090` and `SUPABASE_SECRET_KEY=test`, and gives `next dev` `NEXT_PUBLIC_SUPABASE_URL=http://localhost:8090` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=test`. Accounts are therefore **on** for the whole browser run; the existing 13 tests then prove the signed-out guest flows still work with accounts on. Usernames in tests are unique per test (suffix from `test.info()`), since the fake's state is shared across workers.

`e2e/helpers.ts` gains `signUp(page, username, { email = `${username.toLowerCase()}@test.example`, password = "12345678" } = {})` (goes through `/login/` and `/welcome/`, draws one stroke, saves, lands on `/`) and reuses `failOnPageErrors`.

- [ ] **Step 1: Write the tests** in `account.spec.ts`:
  - `sign up with e-mail, pick a username, draw an avatar, land on the home as that user` — after `signUp`, the landing shows the username and an avatar `<img>` whose `naturalWidth` is 256; no nickname field.
  - `sign in with Google goes through onboarding the first time and straight home the second` — click "Entrar com Google" (the fake redirects back at once); first time lands on `/welcome/`; after finishing, sign out and click it again → `/` with the same username.
  - `the avatar canvas lets you draw across region borders` — one drag from the forehead to the chin; `canvasHasInk` at a point on the cheek (outside every region rect) is true; no region labels are in the DOM.
  - `e-mail, password and username rules are enforced` — a malformed e-mail, a 7-character password and a mismatched confirmation each show their message and create no account; in onboarding `ab` and `ana maria` are refused.
  - `an e-mail that already has an account is refused` → "Esse e-mail já tem conta".
  - `a username that exists in another capitalisation is refused` — one account takes `Ana<suffix>`; a second account trying `ana<suffix>` in onboarding sees "Esse username já existe".
  - `sign out and sign back in` — wrong password → "E-mail ou senha incorretos"; right password → home with the same avatar.
  - `abandoned onboarding resumes` — sign up, leave `/welcome/` for `/`, `/profile/` and `/avatar/` → each redirects to `/welcome/`; sign out and in again → `/welcome/`; finishing lands on `/`.
  - `redraw the avatar from the profile` — the profile `<img>` `src` changes after saving.
  - `change the password from the profile` — old password stops working, new one works; a Google-only account's profile has no password form.
  - `the e-mail never reaches other players` — a `bot` guest in the logged-in player's room: no message it receives contains the player's e-mail or its local part followed by `@`.
  - `a logged-in player hosts a room and a guest sees their username and avatar` — the page creates a room without typing a nickname; a `bot` guest's `room-state` lists the host with the username and an `avatarUrl`; the page's lobby shows the avatar image for itself and a letter placeholder for the bot.
  - `a logged-in player opening an invite link skips the nickname prompt`.
  - `a guest opening an invite link is still asked for a nickname` (accounts on, signed out).
- [ ] **Step 2: Run** `npm run test:e2e` — all pass, twice in a row (state is shared; this catches username collisions between runs within one server lifetime).
- [ ] **Step 3: Accounts-off check** — run `NEXT_PUBLIC_SUPABASE_URL= npm run build` and serve `apps/web/out`: the landing has no "Entrar / Criar conta" link and `/login/` redirects to `/`.
- [ ] **Step 4: Commit** `test(e2e): account flows against a fake Supabase`
- [ ] **Step 5: Real-project check (needs the owner to have done `docs/supabase-setup.md`).** With `apps/web/.env.local` and the server env pointing at the real project, by hand: sign up with an e-mail and confirm no confirmation is asked; sign in with Google on localhost and on the Pages URL (this proves the redirect URLs and the base path); finish onboarding; confirm the row and file in the dashboard and that `profiles` holds no e-mail; try from the browser console to update `username` on the own profile row and to insert a row with another user's id (both must be refused); join a room and see the avatar from a second browser; try a Google sign-in whose address already has an e-mail account and write what happens into the setup guide. Record the outcome in the PR description. If the owner's project isn't ready, the PR can still merge: accounts stay off in production until the variables are set.

---

## After this plan

Open a PR from `feat/accounts` to `main` (merge commit, as the repo does). Then write the stage 2 plan (home + public rooms), which builds on `useAccount`, `Avatar`, `AccountMenu`, `Player.userId` and the fake Supabase from here.
