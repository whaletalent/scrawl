# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Scrawl — a realtime multiplayer party drawing game. Two-workspace npm monorepo:

- `apps/web` — Next.js 15 (App Router) + React 19 + Tailwind v4, built as a **static export** (`output: "export"`) and deployed to GitHub Pages. Port **3000** in dev.
- `apps/ws-server` — standalone WebSocket server (`ws`) run with `tsx`. Port **8080**.

The WebSocket server is authoritative for game state; all rooms live in memory (`rooms: Map<string, Room>` in `apps/ws-server/src/room-manager.ts`). A restart drops every active game — there is no persistence layer. (The original MVP plan called for Firebase; it was never wired in and was removed. `.env.local` may still hold unused `NEXT_PUBLIC_FIREBASE_*` vars.)

UI copy is in **Portuguese (pt-BR)**; types, code, commit messages, and this file are in English.

## Commands

Run from repo root (npm workspaces):

```bash
npm run dev              # Start web (3000) + ws-server (8080) in parallel
npm run build            # Static export of the web app -> apps/web/out/
npm run build:server     # tsc -> apps/ws-server/dist/
npm run lint             # ESLint (flat config at the root, covers everything)
npm run format           # Prettier --write; CI runs format:check

# Per workspace
npm run dev   --workspace=@scrawl/web
npm run dev   --workspace=@scrawl/ws-server   # tsx watch
```

Node 24 (`.nvmrc`). CI (`.github/workflows/ci.yml`) runs lint, format:check, typecheck, server tests, both builds and the Playwright suite — run those before pushing.

```bash
npm test                 # server suite + web unit tests, ~10s (node:test via tsx)
npm run test:e2e         # Playwright browser suite, ~3min
npm run typecheck        # ws-server (src + test), web, e2e

# A single server test file / a single test by name
cd apps/ws-server && npx tsx --test --test-reporter=spec test/party.test.ts
cd apps/ws-server && npx tsx --test --test-name-pattern="drawing votes" test/*.test.ts
# A single e2e spec / test
npx playwright test e2e/party.spec.ts
npx playwright test -g "invite link"
```

### Testing

- **Server suite** — `apps/ws-server/test/*.test.ts`. `test/server.ts` starts the real server in-process on port 0 (`createScrawlServer` from `src/app.ts`; `src/server.ts` is just the listen entrypoint). `test/client.ts` is a small WebSocket client: register `c.wait(pred)` **before** triggering the action that causes the message (it only sees future messages), or use `c.on(handler)` for bots that react to everything.
- **Time** — `src/config.ts` holds `timeScale` and `reconnectGraceMs`, read at use-time. Tests set them through `startServer({ timeScale, graceMs, submitGraceMs })` (or mutate `config` mid-test) so a whole game takes a second or two. Files that poke at a single phase keep `timeScale: 1` so nothing advances underneath them.
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

**End of a drawing turn**: when a drawing phase's timer runs out the server does not close it at once. It broadcasts `time-up` (`startCollecting`, game-engine), and the turn stays open for `config.submitGraceMs` (`SUBMIT_GRACE_MS`, default 3s, not scaled) or until every drawing is in. Clients send their drawing when they get `time-up`, never on their own clock: a phone whose clock is behind, or a slow link, used to miss the turn. Every `submit-*drawing` carries its `round`, and one for another round is dropped (`isCurrentRound`) instead of landing in the next round.

**Jogar de novo**: on a final screen the host sends `play-again`; `resetForNewGame` (game-engine) clears everything of the last game (scores, rounds, drawings, saved keys) and goes back to `lobby`, then handlers.ts sends every player a fresh `room-state` and calls `publishRooms()`. `room.game` counts the games, so a gallery save still in flight from the old game is not announced in the new one. The client clears its per-game state (`PER_GAME` in `use-game-state.ts`) on any `room-state` in the lobby.

**Players leaving mid-game**: the socket `close` handler calls `handlePlayerLeft` (game-engine). 2-player modes end immediately in their final phase with only the completed rounds; party ends in `final-results` once fewer than 4 players remain, otherwise it carries on. Clients get a `notice` message explaining why. `player-left` carries `hostId` because `removePlayer` may promote a new host.

### Module imports in ws-server

`apps/ws-server/tsconfig.json` uses `"module": "NodeNext"`, so **local imports must include the `.js` extension** even in `.ts` source (`import { ... } from "./room-manager.js"`). Omitting it breaks dev (`tsx watch`) and the built output.

### Canvas subsystem

Canvases are a fixed **800×600 logical coordinate space**; pointer events are rescaled in `getPoint`. Two hooks:

- `apps/web/src/hooks/use-canvas.ts` — general drawing (brush / eraser / fill / line / circle / rectangle), clipped to a `side` region (`left` / `right` / `top` / `bottom` / `full`). Used by party and split-body modes.
- `apps/web/src/hooks/use-face-canvas.ts` — face-builder variant. Draws are clipped to the player's **assigned** face regions only; the hair region is ellipse-based (see `isPointInRegion` in `apps/web/src/lib/face-regions.ts`). Also owns **undo/redo history** and `Ctrl+Z` / `Ctrl+Y` bindings. Exports a transparent PNG (white bg + template are HTML layers _behind_ the canvas).

`FACE_REGIONS` in `lib/face-regions.ts` is the source of truth for region geometry — changing a rect changes both hit-testing and clipping.

### Landing → room handoff

`apps/web/src/app/page.tsx` renders `Entry` (`components/landing/entry.tsx`), which shows the guest landing (`Landing`) or the logged-in `Home`. The landing's `PlayForm` stuffs nickname and room-creation options into `sessionStorage` (`scrawl-nickname`, `scrawl-gameMode`, `scrawl-totalRounds`, `scrawl-turnDuration`, `scrawl-faceTemplate`, `scrawl-skinTone`) and navigates to the room page.

Because the site is a static export there is no dynamic `/room/[code]` segment: the room page is `/room/?code=ABCDE` (`app/room/page.tsx` wraps `room-client.tsx` in `<Suspense>` for `useSearchParams`). Build room links with `roomPath` / `roomUrl` from `lib/routes.ts` — never by hand — because the deployed site lives under a base path (`NEXT_PUBLIC_BASE_PATH`, `/scrawl` on GitHub Pages) that `router.push` and `<Link>` add automatically but `window.location` / `history.replaceState` / `<a href>` do not.

Only the sentinel `?code=new` triggers `create-room` on the socket; any other code is treated as a join. If there is no `scrawl-nickname` (someone opened an invite link directly), the page asks for one first. The real room code is assigned by the server and arrives in the `room-state` message, at which point the page rewrites the URL (`history.replaceState`) so it works as an invite link.

### WebSocket client

`apps/web/src/lib/ws-client.ts` holds a **module-level singleton socket** with a 2s auto-reconnect.

### Reconnection

A fresh socket is anonymous to the server, so slots are reclaimed with a per-player secret:

- `room-state` (sent only to the player it concerns) carries `sessionToken`. The client keeps `{ code, token }` in `sessionStorage` (`scrawl-session`) and in a ref inside `use-game-state.ts`.
- When a socket closes, the server does **not** remove the player: `handleDisconnect` (handlers.ts) marks them `connected: false`, broadcasts `player-connection`, and arms a grace timer (`RECONNECT_GRACE_MS`). Only when it fires does `dropPlayer` run the real removal (`player-left` + `handlePlayerLeft`).
- The client sends `rejoin { roomCode, token }` on every socket re-open (network blip) and on page load when the stored session matches the URL's room code (reload). The server swaps the socket in, sends `room-state`, then `resyncPlayer` (game-engine) replays whatever the current phase needs (`pair-assigned`, `split-round-start`, `face-round-start`, drawings/results). Those per-player messages carry `submitted` so the UI knows the round's drawing is already in. A canvas in progress survives a socket blip but not a reload.
- `rejoin-failed` → the page falls back to a normal join (or shows an error if it was mid-session). `session-replaced` is sent to the old socket when the same token rejoins from another tab; that tab stops reconnecting so two tabs don't steal the slot back and forth.
- Never put `token` in anything broadcast — use `publicPlayer` / `publicPlayers` from room-manager.ts to serialize players.

### Accounts (optional, Supabase)

Design: `docs/superpowers/specs/2026-11-21-accounts-profile-home-design.md`. Owner's setup steps: `docs/supabase-setup.md`. Schema: `supabase/migrations/`.

- Sign-in (e-mail + password, Google) is Supabase Auth, called straight from the browser. The **username is not the login**: it is the public name, chosen with a self-drawn avatar in onboarding and stored in the public `profiles` table (`id`, `username`, `avatar_url`). E-mail addresses never leave Supabase Auth.
- **Accounts are off when Supabase isn't configured** — web: `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`; server: `SUPABASE_URL` + `SUPABASE_SECRET_KEY`. Off means no login UI and everyone is a guest. An account is never required to play.
- Web: `lib/supabase.ts` (client or `null`), `lib/account.ts` and `lib/gallery.ts` are the only files that use the Supabase client; components use `hooks/use-account.ts` (`status`: `off` / `loading` / `signed-out` / `needs-profile` / `ready`). Pages guard themselves on the client (static export): `needs-profile` always goes to `/welcome/`.
- "Entrar com Google" only shows when the project has Google on: `googleSignInEnabled` (`lib/supabase.ts`) reads the public `/auth/v1/settings`. The fake Supabase reports it on; a test can `page.route` that URL to turn it off.
- Server: `create-room` / `join-room` take an optional `accessToken`. `withIdentity` (handlers.ts) resolves it through the `Accounts` interface (`src/accounts.ts`) before the player enters the room; a profile replaces the nickname with the username and sets `avatarUrl`. Anything wrong, slow (3s) or unreachable means "guest", never an error. `src/supabase-accounts.ts` is the real implementation (JWKS verification with `jose`, then one REST read).
- **The profile row is written by the browser, so the server trusts nothing in it**: username must match `USERNAME_PATTERN`, and the avatar must be a file inside this project's `avatars/<userId>/` (`isOwnAvatarUrl`). Access tokens and e-mails are never broadcast, and neither is a `userId` field — though the account id is not a secret: it is the folder name inside every avatar URL and the public `profiles.id`. A lookup that fails is logged once a minute per reason (`[accounts] player treated as a guest: …`), which is where to look when everyone shows up as a guest. In the browser every wait on Supabase is capped at `ACCOUNT_TIMEOUT_MS` (3s); past it the player carries on as a guest.
- Tests never touch a real project. Server tests pass a fake `Accounts` to `startServer({ accounts })`, or use `test/fake-supabase.ts` — an in-process fake of the Supabase HTTP API that the browser suite also runs (port 8090), so accounts are **on** during e2e.

### Home and public rooms

- `app/page.tsx` is two pages at one address: `Home` (`components/home/`) when `useAccount().status === "ready"`, the guest landing (`Landing`) otherwise.
- A room has `isPublic` (default false). `createRoom` honours `visibility: "public"` **only for a host who joined with an account**. The web hands the choice to the room page through `sessionStorage` (`lib/room-options.ts`, key `scrawl-visibility`).
- `src/public-rooms.ts` owns the list: a room is listed while public, in `lobby`, not full, and its host's socket is connected. `watch-rooms` / `unwatch-rooms` subscribe a socket (it also stops watching when it closes or enters a room); the server answers with `public-rooms { rooms }` and pushes again whenever a watcher's list would differ. **Anything that changes joinability must call `publishRooms()`** (handlers.ts does after create, join, start, disconnect, rejoin and drop).
- A `PublicRoom` entry is exactly `code`, `hostName`, `hostAvatarUrl?`, `gameMode`, `playerCount`, `capacity` — it goes to anyone who asks.
- Web: `hooks/use-public-rooms.ts` re-subscribes on every socket open and reports `connecting` until the server answers (the list shows "Acordando o servidor…", since the free host sleeps).
- In the browser suite every test shares one game server, so other tests' public rooms are on the list: find a row by its host's unique name, never by position or count.

### Gallery

- Table `drawings` + public bucket `gallery` (`supabase/migrations/0002_gallery.sql`). **Only the game server writes them** (secret key); browsers read, and an author or whoever saved a drawing may delete it — file first, then row, because the storage policy proves the right through the row.
- Saving: on a final screen (`final-results`, `split-final`, `face-final`) the browser composes the 800×600 PNG (`lib/compose-drawing.ts`) and sends `save-drawing { drawing: { round, pairId? }, imageDataUrl }`. `src/gallery.ts` checks the sender has an account, the phase, that the drawing exists and isn't saved, and the PNG (signature, ≤ 1.5 MB), then calls `Accounts.saveDrawing` with **mode, theme and authors from the room's own state** — `room.roster` (never shrinks, so a player who left is still named) and `room.resultAuthors` (party). `author_names` / `author_ids` are parallel arrays, `null` id for a guest.
- The drawing's key (`"round:pairId"` in party, `"round"` otherwise) is claimed in `room.savingDrawings` for the duration of the write and moves to `room.savedDrawings` only when it succeeds. The image must be an 800×600 PNG (checked from its header). Clients get `drawing-saved { key }` (broadcast) or `drawing-save-failed { key, reason }` (sender); `room-state.savedDrawings` covers rejoin.
- 10 saves per player per 24h, counted in `supabase-accounts.ts`, where a player's saves run one at a time (`inTurn`) so the count can't be raced. A save that doesn't clearly succeed is undone (`undo`: row, then image). Nothing is pruned.
- Never render a `profiles.avatar_url` without `projectAvatarUrl` (web) / `isOwnAvatarUrl` (server): the row is written by its owner's browser.
- `fake-supabase.ts` has `/__control/*` routes so a browser test can make saves or image deletions fail for one account.
- Web: `lib/gallery.ts` is the third (and last) file that may import the Supabase client. `components/gallery/` has the save button, the home column, the profile list; `/gallery/` is public.

### Landing page and look

- The guest landing (`components/landing/`) is built on a vendored design kit in `apps/web/public/assets/` (plain CSS and ES modules, never bundled). `kit.tsx` loads it **only while the landing is mounted**, because it styles bare elements; that is why every exit from the landing is a full page load (`window.location`, plain `<a href>` with `BASE_PATH`) and why `globals.css` tells Tailwind not to scan `components/landing` or `public/`.
- The landing lies on the same orange desk as the rest (its page CSS in `landing.tsx` lays it over the kit), with every section **as tall as its content** (the kit's one-screen section heights are switched off), round corners and no shadows: the modes are coloured cards straight on the desk, the round a cream folder, "Sua arte horrível vira lenda" and the gallery full-width bands. The bar is see-through while the page is at its top (`nav--top`, toggled on the element because the kit's script adds its own classes).
- Two React Bits components are vendored in `components/react-bits/` (JS + CSS, typed by a `.d.ts` beside each): `CircularGallery` (the legend's carousel; it only takes a sideways wheel, so the page still scrolls) and `DriftWall` (the gallery's background, `decorative`: hidden from screen readers, no focusable tiles).
- The landing is in the static HTML and readable without JavaScript. A browser that holds a Supabase session hides it (`html.ld-wait`, set by an inline script in `kit.tsx`) until `Entry` knows the account.
- Every other screen is a **drawing desk**: an orange desk (`.desk` on `<body>`), sheets of paper with a folded corner (`.sheet`), plain paper tags (`.tag`), tape (`.taped`) and block buttons with a hard shadow (`.press`) — all in `globals.css`, with the semantic colours (`bg-paper`, `bg-paper-deep`, `bg-card`, `bg-soft`, `text-ink`, `text-muted`, `bg-brand` = the indigo action colour, `bg-amber`, `border-line`…). Use those, not raw `gray-*` / `purple-*`. Corners are square (the radius tokens are 0; only `rounded-full` is round). Headings and buttons are Shantell Sans (`font-display`), text Figtree. Text never sits straight on the desk: `game-controller.tsx` puts every phase on a sheet unless the phase lays out its own papers (`ownPapers`). Design source: the canvas at https://claude.ai/artifact/Gt8Qgi7bNLxkrzxRPayDrN.
- The final screens of the two-player modes (`split-reveal.tsx`, `face-reveal.tsx`) share `components/phases/pair-results.tsx`: every round is a taped card on one sheet, with who drew which part.
- Icons are Phosphor (`@phosphor-icons/react`, `weight="bold"`); `components/brand/` has the logo (`wordmark.tsx`) and the mascot images (`art.ts`).
- The modes have Portuguese names in the UI — **Racha-tema** (`party`), **Monstrinho** (`split-body`), **Caricatura a dois** (`face-builder`); code, protocol and file names keep the English ids.
- The canvas toolbar (`components/canvas/toolbar.tsx`) wraps the canvas: tools on one rail, colours and brush sizes on the other.
- The landing's pictures are made by `scripts/landing-art/`: `capture.ts` plays real games in browser tabs (it needs its own servers, see its header), `cards.ts` puts the finished drawings on result cards for the carousel, and `compose.mjs` turns `captures/` and `mascots/` into `apps/web/public/landing/` and the site icons (the logo is the robot's head, `mascots/head.png`). The game screens appear in those captures, so re-run both after restyling them. The capture script finds a few controls by class name (`lib/pen.ts`).

## Conventions worth knowing

- Path alias `@/*` maps to `apps/web/src/*` (web only).
- Anything a client sends is untrusted: `createRoom` sanitizes options, drawings must be `data:image/png;base64,` URLs (`isPngDataUrl` in handlers.ts), messages are capped at `MAX_MESSAGE_BYTES` (app.ts), and every socket has an `error` listener — without it a protocol error from one client crashes the whole server.
- Strict TypeScript via `tsconfig.base.json` (`strict: true`, `target: ES2022`).
- Room codes are 5 chars from `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (no 0/O/1/I/L confusion).
- `createRoom` sanitizes everything the client sends: rounds clamp 1–5 (all modes), turn duration 15–300s, unknown `gameMode` → `party`, unknown `faceTemplate` → `random`, non-hex `skinTone` → default. 2-player modes cap the room at 2 players.
- `docs/game-mode-ideas.md` is a Portuguese brainstorm list of 40 proposed modes — useful context for mode-related work; not a spec.

## Deploy

- **Web** → GitHub Pages via `.github/workflows/deploy.yml` on every push to `main`. The build gets `NEXT_PUBLIC_BASE_PATH` from `actions/configure-pages` and `NEXT_PUBLIC_WS_URL` from the `WS_URL` repository variable; both are inlined at build time, so changing the server address means re-running the workflow.
- **WebSocket server** → any host that keeps a Node process alive; `apps/ws-server/Dockerfile` (build context = repo root). It must be served over `wss://` for the Pages site to reach it. Rooms are in memory, so run exactly **one** instance and expect a deploy to end running games.
