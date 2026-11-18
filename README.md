# Scrawl

A realtime multiplayer party drawing game. Players share a canvas they can only
half see, and the fun is in the reveal.

## Game modes

| Mode | Players | How it works |
|------|---------|--------------|
| **Party** | 4–10 | Everyone writes absurd themes, pairs draw one theme on a split canvas (left/right) without seeing each other's half, then everybody ranks the results. With an odd number of players, one player per round sits out and judges. |
| **Split Body** | 2 | One player draws the top half of a character, the other the bottom, over a faint silhouette. Sides alternate each round. |
| **Face Builder** | 2 | Six face regions are shuffled and split 3-and-3; each player can only draw in their own regions. |

## Running locally

Requires Node 22+.

```bash
npm install
npm run dev        # web on :3000, WebSocket server on :8080
```

Create `apps/web/.env.local`:

```
NEXT_PUBLIC_WS_URL=ws://localhost:8080
```

Open http://localhost:3000, create a room and share the invite link from the
lobby. To try it alone, open the link in extra browser tabs.

## Project layout

- `apps/web` — Next.js 15 (App Router) + React 19 + Tailwind v4 client.
- `apps/ws-server` — authoritative WebSocket game server (`ws`, run with `tsx`).
- `docs/` — design specs, implementation plans and a list of game mode ideas.

Rooms live in memory on the WebSocket server, so restarting it ends every game.
A player whose connection drops (or who reloads the page) keeps their slot for
20 seconds and is put back into the running game when they return.

## Tests

```bash
npm test             # server suite (~10s): game rules, leaving, reconnection
npm run test:e2e     # browser suite (~1.5min): real UI in Chromium via Playwright
npm run typecheck    # server + tests, web, e2e
```

- **Server suite** (`apps/ws-server/test`) — Node's built-in test runner. Each
  file starts the real server in-process on a free port and plays against it
  with WebSocket clients, with game phases sped up.
- **Browser suite** (`e2e/`) — Playwright drives the real app; the other
  players are scripted bots speaking the WebSocket protocol. It starts its own
  servers (web on :3100, WebSocket on :8089), so it can run next to
  `npm run dev`. First time only: `npx playwright install chromium`.

To play a sped-up game by hand, start the WebSocket server with
`PHASE_TIME_SCALE=0.2` (every phase five times shorter).

## Other commands

```bash
npm run build                                # production build of the web app
npm run lint  --workspace=@scrawl/web
```

See `CLAUDE.md` for architecture notes (message protocol, phase graphs, canvas
subsystem).
