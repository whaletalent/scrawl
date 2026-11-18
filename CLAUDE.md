# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Scrawl — a realtime multiplayer party drawing game. Two-workspace npm monorepo:

- `apps/web` — Next.js 15 (App Router) + React 19 + Tailwind v4. Port **3000**.
- `apps/ws-server` — standalone WebSocket server (`ws`) run with `tsx`. Port **8080**.

The WebSocket server is authoritative for game state; all rooms live in memory (`rooms: Map<string, Room>` in `apps/ws-server/src/room-manager.ts`). A restart drops every active game — there is no persistence layer. (The original MVP plan called for Firebase; it was never wired in and was removed. `.env.local` may still hold unused `NEXT_PUBLIC_FIREBASE_*` vars.)

UI copy is in **Portuguese (pt-BR)**; types, code, commit messages, and this file are in English.

## Commands

Run from repo root (npm workspaces):

```bash
npm run dev              # Start web (3000) + ws-server (8080) in parallel
npm run build            # Build the web app (Next.js)

# Per workspace
npm run dev   --workspace=@scrawl/web
npm run dev   --workspace=@scrawl/ws-server   # tsx watch
npm run lint  --workspace=@scrawl/web         # only web has lint
npm run build --workspace=@scrawl/ws-server   # tsc -> dist/
```

```bash
npm test                 # server suite, ~10s (node:test via tsx)
npm run test:e2e         # Playwright browser suite, ~1.5min
npm run typecheck        # ws-server (src + test), web, e2e

# A single server test file / a single test by name
cd apps/ws-server && npx tsx --test --test-reporter=spec test/party.test.ts
cd apps/ws-server && npx tsx --test --test-name-pattern="drawing votes" test/*.test.ts
# A single e2e spec / test
npx playwright test e2e/party.spec.ts
npx playwright test -g "invite link"
```

There is no root-level lint.

### Testing

- **Server suite** — `apps/ws-server/test/*.test.ts`. `test/server.ts` starts the real server in-process on port 0 (`createScrawlServer` from `src/app.ts`; `src/server.ts` is just the listen entrypoint). `test/client.ts` is a small WebSocket client: register `c.wait(pred)` **before** triggering the action that causes the message (it only sees future messages), or use `c.on(handler)` for bots that react to everything.
- **Time** — `src/config.ts` holds `timeScale` and `reconnectGraceMs`, read at use-time. Tests set them through `startServer({ timeScale, graceMs })` (or mutate `config` mid-test) so a whole game takes a second or two. Files that poke at a single phase keep `timeScale: 1` so nothing advances underneath them.
- **Browser suite** — `e2e/*.spec.ts`, config in `playwright.config.ts`. It launches its own ws-server (:8089, `PHASE_TIME_SCALE=0.15`, `RECONNECT_GRACE_MS=3000`) and `next dev` (:3100, `NEXT_DIST_DIR=.next-e2e` so it doesn't fight `npm run dev` over `.next`). Other players are bots from `e2e/helpers.ts` (`bot`, `autoplayParty`) built on the server suite's `test/client.ts`. `@playwright/test` is pinned to an exact version because each version needs a specific Chromium build (`npx playwright install chromium`).
- When a behaviour changes, change the server test first if the rule lives on the server; add an e2e test only for what needs a real page (routing, storage, canvas, layout).

Web dev requires `apps/web/.env.local` with `NEXT_PUBLIC_WS_URL`. The ws-server reads `PORT` (defaults to 8080), `RECONNECT_GRACE_MS` (defaults to 20000) and `PHASE_TIME_SCALE` (defaults to 1; e.g. 0.2 makes every phase five times shorter for manual testing).

## Architecture

### Client ↔ server protocol

All realtime is JSON over a single WebSocket. The message contract is duplicated on both sides and must stay in sync:

- `apps/ws-server/src/types.ts` — `ClientMessage` union, `Room`, `Phase`, `GameMode`.
- `apps/web/src/types/game.ts` — mirrored `ClientMessage`, plus a `ServerMessage` union and a client-shaped `RoomState` (the server never sends `Map` / `ws` — see `serializeRoomState` in `handlers.ts`).

**Adding a new client→server message** requires edits in three places: server `types.ts` (union), server `handlers.ts` (dispatch in `handleMessage`), and the `use-game-state.ts` hook (add a `send(...)` callback and expose it).

**Adding a new server→client message** requires: server emits via `broadcast` / `sendTo` (in `room-manager.ts`), web `ServerMessage` union, and a new `case` in the `onMessage` switch inside `use-game-state.ts`.

**Adding a new phase**: extend `Phase` on both sides AND add a render branch in `apps/web/src/components/game/game-controller.tsx`. The controller is the single switchboard for rendering per-phase components.

### Game modes and phase graphs

`GameMode = "party" | "split-body" | "face-builder"` — each drives a different phase graph in `apps/ws-server/src/game-engine.ts`:

- **party** (4–10 players): `theme-creation → [theme-voting if >4] → drawing → drawing-voting → reveal → scoreboard → …` repeats for `totalRounds`, then `final-results` (which carries the drawings of **every** round via `room.allResults`). Pairs are shuffled each round; final round scoring doubles. With an odd player count one player sits out per round (no `pair-assigned` for them — the client shows a "jurado" screen); `room.sitOutCounts` rotates who.
- **split-body** (exactly 2 players): alternating top/bottom halves on a shared silhouette; advances when both halves are submitted OR the per-turn timer expires. Ends in `split-final`.
- **face-builder** (exactly 2 players): 6 face regions (`hair`, `ears`, `eyes`, `nose`, `mouth`, `shoulders`) are shuffled and split 3-and-3; each player draws only their assigned regions. Ends in `face-final`. Supports `faceTemplate: "random" | FaceTemplateId` and a `skinTone` hex.

Phase timing lives in `PHASE_DURATIONS` inside `game-engine.ts` (all multiplied by `config.timeScale`); per-turn drawing phases use `room.turnDuration` (clamped 15–300s). `transitionTo` is the only allowed phase mutator — it broadcasts `phase-change` and arms the timeout.

**Players leaving mid-game**: the socket `close` handler calls `handlePlayerLeft` (game-engine). 2-player modes end immediately in their final phase with only the completed rounds; party ends in `final-results` once fewer than 4 players remain, otherwise it carries on. Clients get a `notice` message explaining why. `player-left` carries `hostId` because `removePlayer` may promote a new host.

### Module imports in ws-server

`apps/ws-server/tsconfig.json` uses `"module": "NodeNext"`, so **local imports must include the `.js` extension** even in `.ts` source (`import { ... } from "./room-manager.js"`). Omitting it breaks dev (`tsx watch`) and the built output.

### Canvas subsystem

Canvases are a fixed **800×600 logical coordinate space**; pointer events are rescaled in `getPoint`. Two hooks:

- `apps/web/src/hooks/use-canvas.ts` — general drawing (brush / eraser / fill / line / circle / rectangle), clipped to a `side` region (`left` / `right` / `top` / `bottom` / `full`). Used by party and split-body modes.
- `apps/web/src/hooks/use-face-canvas.ts` — face-builder variant. Draws are clipped to the player's **assigned** face regions only; the hair region is ellipse-based (see `isPointInRegion` in `apps/web/src/lib/face-regions.ts`). Also owns **undo/redo history** and `Ctrl+Z` / `Ctrl+Y` bindings. Exports a transparent PNG (white bg + template are HTML layers _behind_ the canvas).

`FACE_REGIONS` in `lib/face-regions.ts` is the source of truth for region geometry — changing a rect changes both hit-testing and clipping.

### Landing → room handoff

`apps/web/src/app/page.tsx` renders `Hero`, which stuffs nickname and room-creation options into `sessionStorage` (`scrawl-nickname`, `scrawl-gameMode`, `scrawl-totalRounds`, `scrawl-turnDuration`, `scrawl-faceTemplate`, `scrawl-skinTone`) and navigates to `/room/<code>`. The room page reads those keys, and only the sentinel `/room/new` triggers `create-room` on the socket; any other code is treated as a join. If there is no `scrawl-nickname` (someone opened an invite link directly), the page asks for one first. The real room code is assigned by the server and arrives in the `room-state` message, at which point the page rewrites the URL to `/room/<code>` (`history.replaceState`) so it works as an invite link.

### WebSocket client

`apps/web/src/lib/ws-client.ts` holds a **module-level singleton socket** with a 2s auto-reconnect.

### Reconnection

A fresh socket is anonymous to the server, so slots are reclaimed with a per-player secret:

- `room-state` (sent only to the player it concerns) carries `sessionToken`. The client keeps `{ code, token }` in `sessionStorage` (`scrawl-session`) and in a ref inside `use-game-state.ts`.
- When a socket closes, the server does **not** remove the player: `handleDisconnect` (handlers.ts) marks them `connected: false`, broadcasts `player-connection`, and arms a grace timer (`RECONNECT_GRACE_MS`). Only when it fires does `dropPlayer` run the real removal (`player-left` + `handlePlayerLeft`).
- The client sends `rejoin { roomCode, token }` on every socket re-open (network blip) and on page load when the stored session matches the URL's room code (reload). The server swaps the socket in, sends `room-state`, then `resyncPlayer` (game-engine) replays whatever the current phase needs (`pair-assigned`, `split-round-start`, `face-round-start`, drawings/results). Those per-player messages carry `submitted` so the UI knows the round's drawing is already in. A canvas in progress survives a socket blip but not a reload.
- `rejoin-failed` → the page falls back to a normal join (or shows an error if it was mid-session). `session-replaced` is sent to the old socket when the same token rejoins from another tab; that tab stops reconnecting so two tabs don't steal the slot back and forth.
- Never put `token` in anything broadcast — use `publicPlayer` / `publicPlayers` from room-manager.ts to serialize players.

Note: `useParams()` keeps returning `new` for the host after the URL is rewritten with `history.replaceState`; don't use it to decide what to do after the first join.

## Conventions worth knowing

- Path alias `@/*` maps to `apps/web/src/*` (web only).
- Strict TypeScript via `tsconfig.base.json` (`strict: true`, `target: ES2022`).
- Room codes are 5 chars from `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (no 0/O/1/I/L confusion).
- `createRoom` sanitizes everything the client sends: rounds clamp 1–5 (all modes), turn duration 15–300s, unknown `gameMode` → `party`, unknown `faceTemplate` → `random`, non-hex `skinTone` → default. 2-player modes cap the room at 2 players.
- `docs/game-mode-ideas.md` is a Portuguese brainstorm list of 40 proposed modes — useful context for mode-related work; not a spec.
