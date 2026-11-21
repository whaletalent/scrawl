# Home and public rooms (stage 2 of 3) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A logged-in player lands on a home that lists open public rooms they can join, with create-room and join-by-code actions; room creators choose private or public.

**Architecture:** Visibility is a flag on the in-memory room. A small server module keeps the set of sockets watching the list and pushes a fresh `public-rooms` message whenever the listable set changes. The home page subscribes over the existing WebSocket singleton. Nothing is persisted.

**Tech Stack:** unchanged (ws server, Next.js static export, node:test, Playwright with the fake Supabase from stage 1).

**Spec:** `docs/superpowers/specs/2026-11-21-accounts-profile-home-design.md` — sections "Public rooms" and "Home". Builds on stage 1 (`docs/superpowers/plans/2026-11-21-accounts-stage-1.md`): `useAccount`, `Avatar`, `AccountMenu`, `Player.userId`, `withIdentity`, the fake Supabase.

## Global Constraints

- Private is the default; a private room never appears in the list. Only a host who joined with an account can create a public room; anything else is downgraded to private by the server.
- A room is listed while it is public, in `lobby`, not full, and its host's socket is connected (a host inside the reconnect grace period hides the room until they are back).
- A list entry carries exactly: `code`, `hostName`, `hostAvatarUrl` (absent for a guest host), `gameMode`, `playerCount`, `capacity`. Nothing else — no ids, tokens or e-mails.
- If the host leaves and another player is promoted, the room stays listed under the new host.
- Guests and accounts-off behave exactly as before: the signed-out landing is the existing `Hero`; every existing test passes (helpers may be extended).
- The gallery column on the home shows an empty state until stage 3.
- Stage 1's global constraints still apply (pt-BR copy, `.js` imports on the server, mirrored protocol types, no real Supabase in tests, base-path-safe links).

## Review Focus

1. **A watcher that never unsubscribes** (tab closed, socket dropped, navigated into a room) → it is forgotten; no send to a closed socket, no leak. (Task 1)
2. **Two people click "Entrar" on the last seat** → one gets in, the other sees the existing "sala cheia" error with a way back; the list drops the room for everyone. (Tasks 1, 3)
3. **The game server is asleep or restarting while the home is open** → the list area says it is waking the server, recovers by itself when the socket opens, and re-subscribes after every reconnect. (Tasks 2, 3)
4. **A listed room dies between render and click** (host closed the tab) → the room page shows the existing not-found error and a link back; the home never navigates into a broken state. (Task 3)
5. **A guest host after promotion** → listed with the guest's sanitized nickname and no avatar; the entry still has no extra fields. (Task 1)

---

### Task 1: Public rooms on the server

**Files:** Create `apps/ws-server/src/public-rooms.ts`, `apps/ws-server/test/public-rooms.test.ts`. Modify `src/types.ts`, `src/room-manager.ts`, `src/handlers.ts`.

**Interfaces — Produces:**

```ts
// types.ts
interface Room { /* + */ isPublic: boolean }
type ClientMessage = ... | { type: "create-room"; /* + */ visibility?: "public" | "private" }
  | { type: "watch-rooms" } | { type: "unwatch-rooms" };
export interface PublicRoom { code: string; hostName: string; hostAvatarUrl?: string; gameMode: GameMode; playerCount: number; capacity: number }
// server → client:  { type: "public-rooms"; rooms: PublicRoom[] }   (oldest room first)
// room-state.state gains `isPublic: boolean`

// room-manager.ts
export function createRoom(..., profile?: Profile | null, visibility?: unknown): Room; // public only when profile && visibility === "public"
export function allRooms(): Iterable<Room>;
export function roomCapacity(room: Room): number; // 10 party, 2 otherwise (joinRoom uses it too)

// public-rooms.ts
export function listPublicRooms(): PublicRoom[];
export function watchRooms(ws: WebSocket): void;   // sends the current list at once
export function unwatchRooms(ws: WebSocket): void;
export function publishRooms(): void;              // re-sends to every watcher whose last list differs
```

`handlers.ts` calls `publishRooms()` after: create, join, start-game, `dropPlayer`, `handleDisconnect`, `handleRejoin`. A socket stops watching when it closes and when it enters a room.

- [ ] **Step 1: failing tests** (`public-rooms.test.ts`, fake `Accounts` as in `identity.test.ts`):
  - `a watcher gets the list at once, and a public room created by an account shows up in it` — first message `{ rooms: [] }`; after a logged-in `create-room` with `visibility: "public"`, an entry deep-equal to `{ code, hostName: "Ana_99", hostAvatarUrl, gameMode: "party", playerCount: 1, capacity: 10 }`.
  - `private rooms and guests' "public" rooms are never listed` — both create; watcher's list stays empty; the guest's `room-state.state.isPublic` is `false`.
  - `the list follows the room: join, full, start, gone` — public split-body room: listed 1/2; second player joins → not listed. Public party room: join → `playerCount: 2`; with 4 players `start-game` → not listed. Another public room whose only player closes (grace 50 ms) → not listed.
  - `when the host leaves, the room stays listed under the new host` — host closes, grace passes → entry has the guest's nickname and no `hostAvatarUrl` key, `Object.keys` are exactly the five remaining.
  - `a host inside the reconnect grace period hides the room; coming back shows it again`.
  - `a watcher that enters a room, unsubscribes or closes gets no more lists` — and the server keeps working after a watcher's socket is terminated abruptly.
- [ ] **Step 2:** run the file, watch it fail. **Step 3:** implement. **Step 4:** `npm test` green. **Step 5:** commit `feat(server): public rooms and a live list of them`.

### Task 2: Room visibility and the list on the web

**Files:** Create `apps/web/src/hooks/use-public-rooms.ts`. Modify `apps/web/src/types/game.ts`, `hooks/use-game-state.ts`, `app/room/room-client.tsx`, `components/lobby/lobby.tsx`, `components/game/game-controller.tsx`.

**Interfaces — Produces:**

```ts
// types/game.ts: PublicRoom, RoomState.isPublic?, ClientMessage/ServerMessage additions (mirror Task 1)
// use-game-state.ts: createRoom(..., accessToken?, visibility?: "public" | "private")
// use-public-rooms.ts
export function usePublicRooms(): { rooms: PublicRoom[]; status: "connecting" | "ready" };
```

`usePublicRooms` connects the singleton socket, sends `watch-rooms` on every open (so it re-subscribes after a reconnect), is `"connecting"` until the first `public-rooms` after the latest open, and on unmount sends `unwatch-rooms` and unsubscribes its handlers (it does not need to keep the socket). `room-client.tsx` reads `scrawl-visibility` from `sessionStorage` and passes it to `createRoom`. The lobby shows "Sala pública · aparece na lista de salas abertas" when `isPublic`.

- [ ] Implement; `npm run typecheck && npm run test:e2e` green (existing 26); commit `feat(web): room visibility and the public rooms subscription`.

### Task 3: The logged-in home

**Files:** Create `apps/web/src/components/home/home.tsx`, `components/home/room-list.tsx`, `components/home/create-room.tsx`, `e2e/home.spec.ts`. Modify `apps/web/src/app/page.tsx`, `components/landing/hero.tsx` (drop its logged-in branch), `e2e/helpers.ts`, `README.md`, `CLAUDE.md`.

Layout (accepted mockup, see spec): top bar with the logo and `AccountMenu`; main column with "Criar sala" and "Entrar com código", then "Salas abertas (n)" with one row per room — host avatar, "Sala de {hostName}", mode tag, `{playerCount}/{capacity}`, "Entrar"; side column "Últimos desenhos salvos" with the empty state "Os desenhos salvos pela galera vão aparecer aqui." On narrow screens one column, the drawings section below the list. `page.tsx` renders `Home` when `status === "ready"`, the loading line for `loading`/`needs-profile` (redirecting the latter), `Hero` otherwise.

- "Criar sala" expands the existing `ModeSelector` plus a Privada/Pública choice (default Privada, one line of explanation each) and the existing create button labels ("Criar Party" …); it stores the options and `scrawl-visibility` in `sessionStorage` and goes to the room page.
- "Entrar com código" expands the code field + "Entrar" with the existing validation message.
- List states: `connecting` → "Acordando o servidor…"; ready and empty → "Nenhuma sala aberta agora. Crie uma sala pública e chame a galera."; "Entrar" → `router.push(roomPath(code))`.

- [ ] **Step 1: failing browser tests** (`home.spec.ts`; two signed-up browser contexts):
  - `a public room shows on another player's home and can be joined from there` — A creates a public Party room; B's home lists "Sala de A", "Party", "1/10" with A's avatar; B clicks "Entrar" → B's lobby shows both; A's lobby shows "Sala pública".
  - `a private room is not listed` — A creates with the default; B's home shows the empty-list line (and still does after 1 s).
  - `a room that fills up or starts leaves the list` — A's public Split Body room is on C's home; B joins by clicking; C's row disappears.
  - `join by code from the home`.
  - `the home survives the game server being unreachable` — block the WebSocket (`page.routeWebSocket` closing it) → "Acordando o servidor…"; unblock → the list (or empty line) appears without a reload.
  - `a listed room that died shows the not-found error and a way back` — B's home lists A's room; A's context closes; within the grace period B clicks "Entrar" (or after it, if the row is gone the test asserts the row left) → no crash.
  - `on a phone the home is one column with no sideways scroll`.
  - `a signed-out visitor still gets the landing page, with no room list`.
- [ ] **Step 2:** watch them fail. **Step 3:** implement. **Step 4:** `npm run lint && npm run format:check && npm run typecheck && npm test && npm run test:e2e` green, twice for e2e. **Step 5:** docs, commit `feat(web): logged-in home with open rooms`.
