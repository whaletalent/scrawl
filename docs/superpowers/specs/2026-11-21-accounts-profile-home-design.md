# Accounts, profile and logged-in home — design

Date: 2026-11-21
Status: awaiting approval

## Intent

Today a Scrawl player is a nickname typed on the landing page; nothing outlives the room. The owner wants players to have an identity in the game and a place to land:

- **An account** with a unique username and an avatar the player **draws themselves** with the Face Builder canvas, used freely (no region split, no timer). The drawing becomes their profile picture during sign-up.
- **A logged-in home** that lists open rooms created by other players, so someone can join a stranger's room and play ("like Gartic, but very simple"), with the **latest saved drawings from everybody** beside the list.
- **A profile** page.

"Simple" is a requirement, not a mood: this is a hobby project on free tiers, maintained by one person.

## Goals

1. Sign up, sign in, sign out. Signing up asks for a username and has the player draw their avatar.
2. The avatar and username replace the bare nickname wherever players are listed in a room.
3. A home for logged-in players: create room, join by code, list of open public rooms, latest drawings of the community gallery.
4. Logged-in players can save a finished drawing to a public gallery.
5. A profile page: avatar, username, redraw avatar, the gallery drawings the player took part in, sign out.

## Non-goals (first version)

- Friends, followers, chat, match history, statistics, rankings.
- Viewing other players' profile pages.
- Likes/comments on gallery drawings.
- A report button or moderation UI. The owner removes drawings from the Supabase dashboard.
- An in-app "delete my account" button (done by hand in the dashboard on request).
- Joining a game that has already started.
- Persisting rooms. Rooms stay in the game server's memory.

## Anti-goals

- **Requiring an account to play.** Someone who receives an invite link still joins with just a nickname, exactly as today. Guests can also still create (private) rooms.
- Passwords or password hashes ever reaching our own server.
- The Supabase secret key in the web bundle, or a player's access token / e-mail in anything broadcast to a room.
- The test suites depending on a real Supabase project or on network access.
- A private room showing up in the public list.

## Constraints

- `apps/web` is a **static export** on GitHub Pages under a base path (`/scrawl`): no server routes, no middleware, no dynamic segments. Every page decides what to show on the client. Build links with the helpers in `lib/routes.ts`.
- `apps/ws-server` is a single Node process on Render's free tier: it sleeps when idle (first connection takes up to about a minute), has no disk worth using, and a deploy ends running games.
- The protocol is duplicated in `apps/ws-server/src/types.ts` and `apps/web/src/types/game.ts` and must stay in sync (see `CLAUDE.md`).
- Everything a client sends is untrusted.
- UI copy in pt-BR; code, docs and commits in English.
- Supabase free plan: 500 MB database, 1 GB file storage, project **paused after one week of inactivity**. The built-in e-mail service only delivers to members of the Supabase organization, so e-mail confirmation and password recovery do not work for real users without a custom SMTP provider (which needs a domain the project doesn't have).

## Approaches

Where accounts and drawings live. In all three the list of open rooms comes from the game server, because rooms live in its memory.

| | A. Supabase | B. Firebase | C. Everything on our server |
|---|---|---|---|
| What | Supabase Auth + Postgres + Storage; the site talks to it directly; the game server only verifies who a player is and writes gallery entries | Same role, Firebase Auth + Firestore | Postgres (Neon) + hand-written login inside the game server |
| For | Least code of ours; no credentials on our server; home loads the gallery even while Render sleeps | Never paused for inactivity | Full control; easiest to test with the current suites |
| Against | Free project pauses after a week idle; browser tests need a stand-in | File storage needs the paid plan, so images would live in the database (1 MB/record); weaker queries; Firebase was already removed from this project once | We would own credential storage and recovery, the riskiest code to hand-write; login and home wait for Render to wake up |

**Chosen: A (Supabase)**, picked by the owner on the recommendation that it keeps the dangerous part (login) out of our code and that the idle pause has a simple workaround (a scheduled request, below).

## How it works

### Pieces

```
Browser (static site)
  ├── Supabase Auth      sign in / session
  ├── Supabase Postgres  read+write own profile, read gallery   (row-level security)
  ├── Supabase Storage   upload own avatar, read images
  └── WebSocket ──► game server
                      ├── verifies the player's access token (JWKS), reads their profile
                      ├── keeps the list of public rooms (memory)
                      └── writes gallery entries with the secret key
```

### Sign-in method

**Proposed: "Entrar com Google" only** (Supabase Auth Google provider, PKCE flow, redirect back to the site). No passwords anywhere, and no e-mail delivery needed. _(This replaces the e-mail + password idea floated in the conversation, because of the e-mail constraint above. Pending the owner's confirmation.)_

### Data (Supabase)

`profiles`

| column | notes |
|---|---|
| `id` | uuid, primary key, references `auth.users` (cascade delete) |
| `username` | unique case-insensitively; 3–16 chars; letters, digits, `_` and `.` |
| `avatar_url` | public URL of the current avatar |
| `created_at` | |

Row-level security: anyone can read; a user can insert and update only their own row.

`drawings` (the gallery)

| column | notes |
|---|---|
| `id` | uuid |
| `image_url` | public URL of the composed PNG |
| `game_mode` | `party` / `split-body` / `face-builder` |
| `theme` | party only, the round's theme text; else null |
| `author_names` | text[], the two players' names as shown in the game |
| `author_ids` | uuid[], the authors who were logged in (may be empty or one) |
| `saved_by` | uuid of the player who pressed save |
| `created_at` | |

Row-level security: anyone can read; nobody inserts from the browser (only the game server, with the secret key); a user can delete a row if they are in `author_ids` or are `saved_by`. That delete is the escape valve for "my partner published our drawing and I don't want it public", so **removing must also delete the image file**, not just the row: the `gallery` bucket gets a delete policy that allows a user to delete the file of a drawing they could delete (looked up through the `drawings` row), and the browser removes the file and then the row. An orphaned public file is not an acceptable outcome.

Storage: two public-read buckets. `avatars` — a user can write only under their own `<userId>/` folder; each new avatar gets a new file name so caches never show a stale one. `gallery` — written only by the game server.

The schema and policies live in the repo as SQL (`supabase/migrations/`), so the project can be recreated.

### Account creation (onboarding)

After the first Google sign-in there is no `profiles` row. Until there is one, the player is sent to onboarding and can't reach the home:

1. **Username** — with a live "already taken" check; the unique index is the real guard.
2. **Draw your avatar** — the Face Builder canvas (`FaceCanvas` / `use-face-canvas.ts`) in a new **free mode**: the whole canvas is drawable, strokes are not clipped to regions, and no region outlines or labels are shown. (Assigning all six regions is not enough: the regions don't cover cheeks, jaw or chin, and each stroke is clipped to the region it started in.) The player picks one of the five face templates and a skin tone (same controls as room creation); brush, eraser, fill, shapes, undo/redo as in the game; no timer.
3. On save, the browser composes background + template + drawing (the same composition `FaceReveal` does), crops a square around the face, scales it to a small PNG (256×256), uploads it and creates the profile row.

The avatar step is required, but an untouched template is a valid avatar. Username and avatar can both be changed later from the profile (avatar via the same canvas, starting blank).

### Identity inside a room

- `create-room` and `join-room` gain an optional `accessToken`. The game server verifies it against the Supabase project's JWKS, loads the profile, and uses the profile's **username as the player's name** and its `avatar_url` as their avatar. The player keeps a `userId` server-side.
- No token, an invalid token, or Supabase unreachable → the player is a guest with the nickname they sent, as today. Never an error.
- Public player objects gain `avatarUrl` (absent for guests). `userId` and the token are never broadcast.
- A guest may type a nickname equal to someone's username; there is no lookup to prevent it (it would put Supabase on the guest path). The avatar is the tell: only accounts have one, in rooms and next to author names in the gallery (guest authors show the placeholder).
- Reconnection is unchanged: the existing per-player session token still reclaims the slot; identity was established at join.
- A logged-in player who opens an invite link skips the nickname prompt.
- Avatars are shown in the lobby player list, the scoreboard, the final/reveal screens next to author names, and the share card. Guests get a neutral placeholder (their initial). If drawing a cross-origin avatar onto the share-card canvas proves troublesome, the share card may stay name-only.

### Public rooms

- Room creation gets a choice: **Privada** (default; only reachable by code/link, today's behaviour) or **Pública** (listed on the home). Only logged-in hosts can create public rooms; `createRoom` downgrades anything else to private.
- A room is **listed** while it is public, in the `lobby` phase and not full. It leaves the list when the game starts, fills up, or is destroyed.
- The home subscribes over the existing WebSocket (`watch-rooms`); the server answers with the current list and pushes a fresh list whenever it changes. Each entry: code, host name, host avatar, game mode, player count, capacity. Subscription ends when the socket joins a room or closes.
- If the host leaves and another player is promoted, the room stays listed under the new host's name (placeholder avatar if they are a guest).
- "Entrar" on a row navigates to the normal room page with that code. Losing the race for the last seat shows the existing "room is full" error with the link back.

### Home

`/` renders one of two things, decided on the client once the session is known (a brief neutral loading state first, never a flash of the wrong one):

- **Logged out** — today's landing (`Hero`: nickname, create room, join by code) plus an "Entrar / Criar conta" button.
- **Logged in** — the home:

```
┌──────────────────────────────────────────────────────────────┐
│ Scrawl                                        (avatar) user ▾ │
├───────────────────────────────────────┬──────────────────────┤
│ [Criar sala] [Entrar com código]      │ Últimos desenhos     │
│                                       │ salvos               │
│ Salas abertas (4)                     │ ┌────┐ ┌────┐        │
│ (av) Sala de marina_d  Party   3/10 ▸ │ └────┘ └────┘        │
│ (av) Sala de zeca      Face    1/2  ▸ │ ┌────┐ ┌────┐        │
│ (av) Sala de tati.r    Party   6/10 ▸ │ └────┘ └────┘        │
│                                       │ Ver todos            │
└───────────────────────────────────────┴──────────────────────┘
Phone: one column; the drawings become a horizontal strip below the room list.
```

The owner saw and accepted this layout as an HTML mockup (`.superpowers/brainstorm/…/content/home-layout.html`).

- Empty list: a line inviting the player to create a public room.
- While the socket is still connecting (Render waking up), the room list area says so ("Acordando o servidor…") instead of looking empty. The gallery column loads independently from Supabase.
- "Criar sala" opens the existing mode selector plus the private/public choice; no nickname field.
- The avatar menu leads to the profile and to sign out.
- "Ver todos" opens a gallery page: newest first, paged. Selecting a drawing shows it larger with authors, theme (if any) and date.

### Saving a drawing to the gallery

- On the **final screens** (party `final-results`, `split-final`, `face-final`), each finished drawing gets a "Salvar na galeria" button, visible to logged-in players in the room. (Not on the timed mid-game party `reveal`; the final screen already lists every round.)
- The browser composes the final image the same way those screens / the share card already do (800×600 PNG) and sends `save-drawing` with a reference to the result (round, and pair for party) and the image.
- The game server checks: sender is a logged-in player of this room; the room is in a final phase; the referenced result exists; it hasn't been saved yet; the payload is a PNG data URL within a size cap. It then uploads the image and inserts the row, taking **mode, theme and author names/ids from its own state**, not from the client. It broadcasts `drawing-saved` so everyone's button turns into "Salvo".
- The server cannot check that the pixels match the game, and doesn't try: what's drawn in a game is arbitrary anyway. Routing through the server buys trustworthy authorship, one entry per drawing, and "you must have actually played".
- The profile page lists gallery drawings where the player is in `author_ids` or is `saved_by`, each with a "Remover da galeria" action.
- **Volume:** a player can save at most 10 drawings per day (checked by the server against `saved_by`). Nothing is pruned automatically: saved drawings are things people chose to keep. If storage ever fills up, saving fails with a plain message and the owner cleans up by hand.

### Configuration and running without accounts

- Web: `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (public by design; repository variables read by `deploy.yml`).
- Game server: `SUPABASE_URL` and `SUPABASE_SECRET_KEY` (Render environment; never in the repo).
- **When these are unset, accounts are off**: the site shows today's landing with no login button, the server treats everyone as a guest, rejects public rooms and saves. Local development and the existing suites keep working with no Supabase.
- A scheduled GitHub Actions workflow makes one read request a day to the Supabase project so the free plan doesn't pause it.

### Testing

- Server suite: the Supabase-facing code sits behind one small interface (verify token → profile, save drawing) that tests replace with a fake. New tests cover: token → username/avatar on join; bad token → guest; public rooms listing and its updates (start, full, destroyed, private never listed, guest can't create public); save-drawing checks (guest, wrong phase, unknown result, duplicate, non-PNG) and that authorship comes from server state.
- Browser suite: existing guest flows must pass untouched. Logged-in flows (onboarding, home, save) run against a stand-in for Supabase; how is the builder's choice.

## Build order

Three stages, each shippable on its own:

1. **Accounts** — Supabase project + schema, sign-in, onboarding with the avatar canvas, profile page, identity and avatars inside rooms.
2. **Home and public rooms** — private/public choice, room list subscription, the logged-in home (gallery column empty-state until stage 3).
3. **Gallery** — save from final screens, home column, gallery page, profile list and remove.

## Manual steps for the owner

The implementer can't do these: create the Supabase project; create a Google OAuth client and enable the Google provider; allow the site's URLs as redirect URLs (`https://whaletalent.github.io/scrawl/` and localhost); run the SQL; set the two repository variables and the two Render environment variables.

## Decided by the owner

- Account = username + self-drawn avatar, drawn with the Face Builder used freely, at sign-up.
- Home = list of open rooms from other players that can be joined, kept very simple, plus the latest saved drawings **from everybody** at the side.
- Approach A (Supabase).
- Accepted as proposed: only lobby-phase rooms with a free seat are listed; the creator chooses public or private; playing without an account keeps working; avatars appear next to names in rooms; the home layout.

## Calls made by the designer (not discussed in detail — check these)

- Google-only sign-in (pending confirmation, see above).
- Saving happens on final screens only; any logged-in player in the room may save; one gallery entry per drawing; the save goes through the game server with a browser-composed image.
- An author, or whoever saved it, can remove a drawing from the gallery, file included; the owner moderates from the dashboard.
- Profile lists drawings the player co-authored or saved.
- At most 10 saves per player per day; no automatic pruning.
- Guests may share a name with an account; the avatar tells them apart.
- A public room stays listed when the host changes.
- The avatar canvas is a real free mode, not "all six regions".
- Username rules (3–16, letters/digits/`_`/`.`, unique ignoring case) and that it can be changed.
- Avatar is a 256×256 PNG; required step, untouched template allowed.
- Only logged-in hosts can create public rooms; private is the default.
- Room list over the WebSocket with push updates.
- Accounts switch off entirely when Supabase isn't configured.
- Daily keep-alive request.

## Left to the builder

Route names and page structure; the Supabase client wrapper; exact crop of the avatar; component breakdown; the gallery page size; the stand-in used by the browser suite; SQL details; the size cap for saved images; copy wording (pt-BR, in the tone of the existing UI). Check Supabase specifics (key naming, JWKS verification, storage policies) against the current docs rather than memory.
