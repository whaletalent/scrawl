# "Emenda" mode (live shared strips) — Design Spec

Name in the UI: **Emenda** (owner's choice). Code, protocol and file id: `seam`. Status: approved by the owner on 2026-11-24.

## Intent

A new mode where small groups draw one picture together, each player hiding most of their part, and only the borders between neighbours shared live. The fun is the **surprise at the reveal**: you saw your partner's strokes reach the border and you continued them, but you never saw what they drew on their own side. No theme, no voting, no score: drawing, then the reveal.

The same live border goes into **Racha-tema**: its pair keeps drawing blind halves, but gains a shared strip in the middle where both see each other live. Racha-tema keeps its theme, voting and score.

### Goals

- 2–10 players, regrouped at random every round into pairs, or pairs plus one trio when the count is odd.
- Each player draws on their own zone plus the shared strip(s) next to it. In a strip they see their neighbour's strokes arrive live, at roughly 8–10 updates per second.
- The neighbour's own zone is grey and hidden until the reveal.
- A reveal after every round (that round's pictures), and a final screen with every picture of every round, which can be saved to the gallery.
- Racha-tema gets the middle strip with the same mechanism.

### Non-goals

- Themes, prompts, voting or points in Emenda.
- Smooth stroke-by-stroke streaming. The strip is sent as images (see Approaches); stroke streaming can replace it later without changing the mode.
- Seeing the whole canvas live (that was the old "live co-op" idea; not this).
- Spectators or late joiners in a running game (same as today: joining is lobby-only).

### Anti-goals

- Leaking a player's hidden zone before the reveal. A player's private zone never leaves their browser during the round; only their part of the strips does.
- A player erasing or bucket-filling over their neighbour's strokes in the strip.
- A dropped connection losing what the neighbour already drew in the strip.

## Approaches (decided: 1)

1. **Strip snapshots (chosen).** While drawing, the browser sends a PNG of *its own layer* cropped to each strip it shares, at most every ~100 ms and only when the strip changed. The server relays each snapshot to the one neighbour sharing that strip and keeps the latest for resync. The receiver draws it on a separate layer under/over its own.
   - Every tool works the same, with no special rules.
   - "Erase only your own" comes for free, because the layers are separate.
   - Rejoin gets the latest frame.
   - Cost: the partner's strokes arrive in frames, not perfectly smooth.
2. **Stroke streaming.** Smoothest, but fill, shapes and eraser need their own replay rules, and the server must store and replay every stroke. It is more protocol and more limits.
3. **Server keeps the whole drawing.** Most correct, largest change, and it would change how every mode delivers drawings.

The owner picked 1.

## Game flow (Emenda)

```
lobby → seam-drawing → seam-reveal → (next round: seam-drawing …) → seam-final
```

- **Lobby.** Created like Racha-tema from the room options: rounds 1–5 (same clamp as every mode) and turn duration 15–300 s (same as split/face). There is no template or theme option. It starts with 2+ players, and the room capacity is 10.
- **Grouping (every round).** Shuffle the players (as `assignPairs` does), then cut them into groups of 2, and with an odd count the last group is a trio.
  - The order inside a group is the left-to-right position.
  - A 2-player room is always one pair.
  - A 3-player room is one trio.
  - My call: across rounds, prefer giving each player a different position (left / middle / right) when the shuffle allows; plain reshuffle is acceptable.
- **seam-drawing.** Each player gets a `seam-round-start` with:
  - `round` and `totalRounds`;
  - `groupId`;
  - the group's member ids and names in order;
  - their own index;
  - `submitted` / the neighbours' latest strip frames (for resync).

  Then they draw, and the turn ends the existing way: the timer runs out, `time-up` is sent, the grace period follows, and the drawings are collected (`startCollecting`, `isCurrentRound`, round-tagged submits). The round also ends early when every member of every group has submitted.
- **seam-reveal.** It shows every group's composed picture for that round, with member names. Duration: my call, 10 s scaled like party `reveal`, and the host may not skip.
- **seam-final.** It shows every picture of every round, with save-to-gallery and the share card. Play-again works the same as the other final screens (it is added to `FINAL_PHASES`).

## The paper (geometry)

The logical canvas stays 800×600. A strip is **100 px wide** (1/8 of the width, as in the owner's references) and full height.

- **Pair:** A owns `x 0–350`, the strip is `350–450`, B owns `450–800`.
- **Trio:** A owns `0–200`, strip 1 is `200–300`, B owns `300–500`, strip 2 is `500–600`, C owns `600–800`.
- A player's **drawable area** is their own zone plus the strips that touch it. This means:
  - the middle player of a trio has two strips;
  - Racha-tema uses the pair geometry.
- **What a player sees during the round:**
  - their own zone and their strips: white paper, their strokes;
  - in each strip, the neighbour's latest frame as well;
  - everything else: a grey "Área do parceiro" block with the neighbour's name, as in the references.
- **Layers in the strip:**
  - own layer on top, neighbour's frame below;
  - eraser and fill act only on the own layer;
  - my call: the fill bucket uses only the own layer as its boundary, the simplest choice. Using the neighbour's frame as a boundary too is a possible later refinement.
- `lib/` gets one geometry module (`seam-geometry.ts`, both sides need the same numbers; duplicated like the protocol types) that gives zones and strips for a group size and an index.

## Live strips (protocol)

- **Client → server:** `strip-frame { round, strip: number, imageDataUrl }`.
  - `strip` is the strip index in the group (0 for a pair, 0 or 1 for a trio).
  - The image is the player's own layer cropped to that strip (100×600 logical px), as a PNG data URL.
- **Server checks:**
  - mode `seam` in `seam-drawing`, or `party` in `drawing`;
  - `isCurrentRound`;
  - the sender belongs to a group that has that strip and touches it;
  - `isPngDataUrl`;
  - size ≤ 150 KB;
  - rate ≤ 15 frames/s per player per strip (excess dropped silently).

  The server never stores more than the latest frame per (group, strip, player).
- **Server → neighbour:** `strip-frame { round, strip, playerId, imageDataUrl }`, sent only to the member on the other side of that strip, never broadcast. Frames from a previous round are dropped on both sides.
- **Client sending:** on any change to the own layer inside a strip, schedule a send. There is at most one in flight per 100 ms per strip, and the last change is always sent. A send happens on pointer-up too.
- **Resync/rejoin:** `resyncPlayer` re-sends `seam-round-start` (or party's `pair-assigned`) with the neighbours' latest frames. A canvas in progress survives a socket blip but not a reload, the same rule as today: after a reload the player's own layer is empty. The own strip frames the server kept are sent back too, so the player sees what they had in the strip, as an image they can't erase. My call, the simplest choice.

## Final drawings

- **Each player submits their whole own layer:** a transparent 800×600 PNG holding only their zone and strips. The submit message is `submit-seam-drawing { round, imageDataUrl }`, with the existing checks, the `drawing-received` confirmation and round tags.
- **A group's picture** is white paper, then for each member in order: that member's **latest strip frames** (kept by the server), then their submitted layer. In the strips, the layers overlap.
  - Drawing a strip twice (frame and layer) where they hold the same strokes is harmless.
  - This is what keeps a member's strip work in the picture after a reload (their new layer lacks it) or after they leave (no layer at all). The server stores the frames with the group's record in `seamDrawings` and sends them with the results, so every renderer composes the same way. The same rule applies to Racha-tema pairs.
- **Server state:** `room.seamGroups` holds the current round's groups; `room.seamDrawings` holds one record per group per round, with group id, round, ordered member names/avatars and layers. Authors are kept for the gallery (like `resultAuthors`), and `room.roster` stays the source for names of players who left.
- **Who left:**
  - a player who leaves mid-round leaves their hidden zone blank, but their strip frames stay; the round goes on for the others;
  - with fewer than 2 players left, the game ends in `seam-final` with the completed rounds, plus a `notice`, the same pattern as split/face.

## Racha-tema changes

- The drawing canvas uses the pair geometry: each player draws on their own zone plus the middle strip, and sees the partner's strip frames live. The partner's zone is grey.
- Each player now submits a **transparent full-width layer**, no longer a half. `DrawingResult.imageLeftDataUrl` / `imageRightDataUrl` keep their names but become full 800×600 layers, and every place that drew them side by side now stacks them on white paper:
  - `drawing-voting.tsx`, `reveal.tsx`, `scoreboard.tsx`;
  - `share-card.tsx`;
  - `lib/compose-drawing.ts`;
  - the landing capture/compose scripts.
- The strip is always on in Racha-tema (owner's decision), not a room option. Each hidden half shrinks from 400 to 350 px.
- Sit-out (jurado) with an odd count stays as it is. Racha-tema does not get trios.
- Monstrinho and Caricatura a dois don't get strips.
- **Deploy:** a clean switch, with no support for the old half-image shape. The web (Pages) and the game server (Render) both deploy automatically when `main` passes CI, and running games end on a server deploy anyway.
- `strip-frame` relays only between the two members of a pair.

## Gallery

- `supabase/migrations/0003_seam_mode.sql` widens the `drawings.game_mode` check to include `'seam'`. The owner applies it (add the step to `docs/supabase-setup.md`). Until it is applied, a seam save fails cleanly (the existing failure path).
- `save-drawing` for seam uses key `"round:groupId"`. Mode and authors come from the room's own state (an author list of 2 or 3).
- `composeSeamDrawing` goes in `lib/compose-drawing.ts`.

## UI

- **Mode name and copy (pt-BR):**
  - name: "Emenda";
  - for: "De 2 a 10 jogadores";
  - text (my call): "Cada um desenha escondido na sua faixa. Na emenda com o vizinho, vocês se veem ao vivo. No fim, o desenho aparece inteiro."
- **Mode selector, lobby, room list:**
  - the mode uses Racha-tema's toy image (`mode-party`) for now, by the owner's choice; it gets its own art later;
  - the room's minimum player count shows as 2.
- **Drawing screen:**
  - the existing `DrawingHeader` / `DrawingFooter` (status badges for every group member), with the toolbar around the canvas;
  - the grey neighbour zones carry the neighbour's name;
  - a thin dashed line marks each strip, as in the references.
- **Reveal and final:** cards like `pair-results.tsx` (taped card, names of the 2 or 3 authors). The final screen uses `PairResults`-style layout with `PlayAgain`.
- **Share card:** today it is party-only; it takes a group of 2 or 3 authors and the stacked picture (builder's call how).
- **Landing:** the modes section gains a fourth card later, when the owner has art for it. Out of scope for this spec; the landing keeps three cards.

## Testing

- **Server suite (`apps/ws-server/test/seam.test.ts`):**
  - grouping for 2..10 players: sizes, trio only when odd, everyone placed once;
  - regrouping each round;
  - `strip-frame` goes only to the neighbour of that strip; a frame for another round, a strip the sender doesn't touch, a non-PNG or an oversize frame is dropped;
  - rate limit;
  - resync carries the latest frames;
  - submits and time-up per round, and the final carries every round;
  - leaving: round goes on, and fewer than 2 players ends the game;
  - play-again;
  - the party strip relay between a pair, with no relay to the sit-out or other pairs.
- **Browser suite:**
  - a two-tab test where one tab draws in the strip and the other tab's canvas shows those pixels (needs a real page; bots don't draw);
  - a reveal/final test with bots submitting layers;
  - update existing party tests for full-width layers.
- `scripts/landing-art`: party capture/compose must stack layers instead of halves. Re-run after the change.

## Left to the builder

- Component structure, and whether `use-canvas` gains a zones/strips mode or a new hook (like `use-face-canvas`) is cleaner.
- Exact throttle mechanics, PNG crop code, and how the neighbour layer is painted (second canvas behind/over, CSS-positioned).
- Copy of the grey-zone label, status texts and notices, in the existing voice.
