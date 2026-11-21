# Gallery (stage 3 of 3) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Logged-in players can save a finished drawing to a public gallery; the home shows the latest ones, a gallery page shows them all, and the profile lists a player's own with a way to remove them.

**Architecture:** Saving goes through the game server: the browser composes the final image and sends `save-drawing` with a reference to the result; the server checks everything against its own room state and writes the image (Storage, `gallery` bucket) and the row (`drawings`) with the secret key. Reading, and removing one's own, happen straight from the browser under row-level security.

**Tech Stack:** unchanged. The fake Supabase gains the `drawings` table and the `gallery` bucket.

**Spec:** `docs/superpowers/specs/2026-11-21-accounts-profile-home-design.md` — "Data (Supabase)" (`drawings`, storage) and "Saving a drawing to the gallery". Builds on stages 1 and 2.

## Global Constraints

- Only a logged-in player of the room can save; only on a final screen (`final-results`, `split-final`, `face-final`); one gallery entry per drawing; at most **10 saves per player per day**; nothing is pruned.
- Mode, theme and authors are taken from the server's state, never from the client. The image is a PNG data URL, at most 1.5 MB decoded, checked by its signature.
- `author_names` and `author_ids` are parallel arrays; a guest author's id is `null` (a refinement of the spec's "may be empty or one", needed to put the right avatar next to the right name).
- Removing a drawing deletes the image file **and** the row; an author or whoever saved it may do so.
- Browsers never insert into `drawings` or write to the `gallery` bucket.
- With accounts off, no save button exists and `save-drawing` is refused.
- Stage 1 and 2 constraints still apply.

## Review Focus

1. **Two players press save on the same drawing at the same moment** → one entry, both see "Salvo". (Task 1)
2. **Supabase fails or is slow while saving** → the button comes back with a plain message, the drawing can be saved again later, no half-written entry is listed. (Tasks 1, 2)
3. **A partner left before the final screen** → their name is still on the entry, from the server's roster. (Task 1)
4. **A client lies** — references a result of another room, a round that doesn't exist, sends a huge or non-PNG payload, or saves from the lobby → refused, nothing written. (Task 1)
5. **Removing** — a stranger cannot remove someone else's drawing; a removed drawing's image URL stops working. (Tasks 2, 4)

---

### Task 1: `save-drawing` on the server

**Files:** Create `apps/ws-server/src/gallery.ts`, `test/gallery.test.ts`. Modify `src/accounts.ts`, `src/types.ts`, `src/room-manager.ts`, `src/game-engine.ts`, `src/handlers.ts`.

```ts
// accounts.ts
export interface GalleryEntry { png: Buffer; gameMode: GameMode; theme: string | null; authorNames: string[]; authorIds: (string | null)[]; savedBy: string }
interface Accounts { /* + */ saveDrawing?(entry: GalleryEntry): Promise<"saved" | "limit" | "failed"> }
// types.ts
export interface DrawingRef { round: number; pairId?: string }           // pairId for party only
Room: roster: Map<playerId, { nickname; userId }>  (never shrinks), resultAuthors: Map<key, [playerId, playerId]>, savedDrawings: Set<key>
ClientMessage: | { type: "save-drawing"; drawing: DrawingRef; imageDataUrl: string }
// server → client: { type: "drawing-saved"; key } (broadcast) · { type: "drawing-save-failed"; key; reason: "limit" | "failed" | "not-allowed" } (sender only)
// room-state.state gains savedDrawings: string[]
// gallery.ts
export const MAX_SAVED_IMAGE_BYTES = 1_500_000;
export function drawingKey(ref: DrawingRef): string;   // party "round:pairId", otherwise "round"
export function handleSaveDrawing(room: Room, player: Player, ref: unknown, imageDataUrl: unknown): void;
```

A key is added to `savedDrawings` before the write is awaited (so a concurrent save is refused) and removed again if the write doesn't end in `"saved"`.

- [ ] Tests first (`gallery.test.ts`, fake `Accounts` recording `saveDrawing` calls): a party result saved with server-side theme/authors and broadcast, `savedDrawings` in a later `room-state`; refusals (guest, lobby, mid-game, unknown round/pair, duplicate, non-PNG, PNG signature missing, oversized, accounts off) each answer `drawing-save-failed` to the sender only and write nothing; `"limit"` and `"failed"` are forwarded and a failed drawing can be saved again; two simultaneous saves make one write; split-body after the partner left still names both. Then implement; `npm test`; commit.

### Task 2: Storage and table

**Files:** Create `supabase/migrations/0002_gallery.sql`. Modify `apps/ws-server/src/supabase-accounts.ts`, `test/fake-supabase.ts`, `test/supabase-accounts.test.ts`, `docs/supabase-setup.md`.

- SQL: `drawings` (`id uuid pk default gen_random_uuid()`, `image_path text not null unique`, `game_mode text check in (...)`, `theme text`, `author_names text[] not null`, `author_ids uuid[] not null`, `saved_by uuid not null references auth.users on delete set null`→ nullable, `created_at`); index on `created_at desc`; RLS select for all, delete where `auth.uid() = any(author_ids) or auth.uid() = saved_by`, no insert/update policy. Bucket `gallery` public, PNG, 2 MB; storage delete policy: the object's name is the `image_path` of a row the user could delete.
- `saveDrawing`: count the player's rows of the last 24 h (≥ 10 → `"limit"`), upload `gallery/<uuid>.png`, insert the row; if the insert fails remove the file; any error or timeout (10 s) → `"failed"`, logged through the existing `problem()`.
- Fake: `drawings` REST (GET with `order`, `limit`/`offset`, `saved_by=eq.`, `created_at=gte.`, `or=(author_ids.cs.{id},saved_by.eq.id)`, `id=eq.`; POST only with the secret key; DELETE under the same rule as the SQL), `profiles?id=in.(...)`, `gallery` storage (upload with the secret key, public GET, DELETE by the rule).
- [ ] Tests first: saved entry is readable with the right columns and its image URL serves the PNG; the 11th save of a day is `"limit"`; a failing insert leaves no file; a stranger's DELETE of row and file is refused, an author's and the saver's work. Implement; commit.

### Task 3: Save from the final screens

**Files:** Create `apps/web/src/lib/compose-drawing.ts`, `components/gallery/save-button.tsx`, `e2e/gallery.spec.ts`. Modify `types/game.ts`, `hooks/use-game-state.ts`, `components/game/scoreboard.tsx`, `components/phases/split-reveal.tsx`, `face-reveal.tsx`, `game-controller.tsx`, `lib/face-compose.tsx`.

- `composePartyDrawing(d)`, `composeSplitDrawing(d)`, `composeFaceDrawing(d)` → 800×600 PNG data URL, white background, matching what the final screen shows (party: halves side by side; split: halves stacked; face: template + both layers).
- `useGameState` exposes `savedDrawings: string[]`, `saveFailed: Record<key, reason>` and `saveDrawing(ref, imageDataUrl)`.
- `SaveButton`: shown only when the viewer's account is `ready`; "Salvar na galeria" → "Salvando..." → "Salvo na galeria" (also when someone else saved it); failure messages: limit → "Você já salvou 10 desenhos hoje. Tente amanhã."; otherwise "Não deu para salvar. Tente de novo."
- [ ] Browser tests first: a logged-in player saves a Split Body result and both players see "Salvo na galeria"; a guest sees no save button; party final lists one button per drawing and saving one doesn't mark the others. Implement; commit.

### Task 4: Home column, gallery page, profile list

**Files:** Create `apps/web/src/lib/gallery.ts`, `components/gallery/drawing-card.tsx`, `components/gallery/latest-drawings.tsx`, `app/gallery/page.tsx`. Modify `components/home/home.tsx`, `app/profile/page.tsx`, `README.md`, `CLAUDE.md`.

- `lib/gallery.ts` (the third file allowed to import the Supabase client): `listDrawings({ offset, limit })`, `listOwnDrawings(userId)`, `removeDrawing(drawing)` (file, then row), each drawing with its authors' avatars resolved from `profiles`.
- Home column: the 6 latest, "Ver todos" → `/gallery/`; empty state kept. Gallery page: newest first, 24 per page with "Carregar mais"; selecting a drawing shows it large with authors, theme and date; reachable signed out too. Profile: "Seus desenhos na galeria" with "Remover da galeria" (confirm inline).
- [ ] Browser tests first: a saved drawing appears on another player's home and on `/gallery/` with both authors' names; the author's partner removes it from their profile and it is gone from the gallery and its image URL returns 404; a third player's profile doesn't list it. Implement; all suites green twice; docs; commit.
