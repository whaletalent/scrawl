import type { DrawingRef, Player, Room } from "./types.js";
import { getAccounts, type GalleryEntry } from "./accounts.js";
import { broadcast } from "./room-manager.js";

/** Largest image a player may put in the gallery (a composed 800×600 PNG is far smaller). */
export const MAX_SAVED_IMAGE_BYTES = 1_500_000;

const PNG_SIGNATURE = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);
const PNG_PREFIX = "data:image/png;base64,";

/** Identifies one finished drawing inside a room: "round:pairId" in party, "round" otherwise. */
export function drawingKey(ref: DrawingRef): string {
  return ref.pairId ? `${ref.round}:${ref.pairId}` : `${ref.round}`;
}

function parseRef(value: unknown): DrawingRef | null {
  if (typeof value !== "object" || value === null) return null;
  const { round, pairId } = value as Record<string, unknown>;
  if (typeof round !== "number" || !Number.isInteger(round)) return null;
  if (pairId !== undefined && typeof pairId !== "string") return null;
  return { round, pairId };
}

function decodePng(value: unknown): Buffer | null {
  if (typeof value !== "string" || !value.startsWith(PNG_PREFIX)) return null;
  // Cheap length check before decoding: base64 is 4 characters per 3 bytes.
  if (value.length > PNG_PREFIX.length + (MAX_SAVED_IMAGE_BYTES * 4) / 3 + 4)
    return null;
  const png = Buffer.from(value.slice(PNG_PREFIX.length), "base64");
  if (png.length > MAX_SAVED_IMAGE_BYTES) return null;
  if (!png.subarray(0, 8).equals(PNG_SIGNATURE)) return null;
  return png;
}

/**
 * What the gallery will say about a drawing, from the room's own records —
 * never from the client. Null when the reference isn't a finished drawing of
 * this room's final screen.
 */
function describe(
  room: Room,
  ref: DrawingRef,
): Pick<GalleryEntry, "theme" | "authorNames" | "authorIds"> | null {
  const authors = (playerIds: string[], names?: string[]) => ({
    authorNames: playerIds.map(
      (id, i) => names?.[i] ?? room.roster.get(id)?.nickname ?? "?",
    ),
    authorIds: playerIds.map((id) => room.roster.get(id)?.userId ?? null),
  });

  if (room.phase === "final-results") {
    if (!ref.pairId) return null;
    const result = room.allResults.find(
      (r) => r.round === ref.round && r.pairId === ref.pairId,
    );
    const playerIds = room.resultAuthors.get(drawingKey(ref));
    if (!result || !playerIds) return null;
    return {
      theme: result.themeText,
      ...authors(playerIds, result.playerNames),
    };
  }
  if (ref.pairId) return null;
  if (room.phase === "split-final") {
    const d = room.splitDrawings.find((s) => s.round === ref.round);
    if (!d) return null;
    return { theme: null, ...authors([d.topPlayerId, d.bottomPlayerId]) };
  }
  if (room.phase === "face-final") {
    const d = room.faceDrawings.find((f) => f.round === ref.round);
    if (!d) return null;
    return { theme: null, ...authors([d.player1Id, d.player2Id]) };
  }
  return null; // not on a final screen
}

/**
 * A player asks to put a finished drawing in the public gallery. The image
 * is what their browser composed (the server only has the separate layers);
 * everything else comes from the room.
 */
export function handleSaveDrawing(
  room: Room,
  player: Player,
  rawRef: unknown,
  imageDataUrl: unknown,
) {
  const send = (message: object) => {
    if (player.ws.readyState === player.ws.OPEN)
      player.ws.send(JSON.stringify(message));
  };
  const ref = parseRef(rawRef);
  const key = ref ? drawingKey(ref) : "";
  const refuse = (reason: "limit" | "failed" | "not-allowed") =>
    send({ type: "drawing-save-failed", key, reason });

  const accounts = getAccounts();
  const about = ref && describe(room, ref);
  const png = decodePng(imageDataUrl);
  if (
    !accounts?.saveDrawing ||
    !player.userId ||
    !about ||
    !png ||
    room.savedDrawings.has(key)
  )
    return refuse("not-allowed");

  // Claimed before the write, so a second save of the same drawing (from
  // anyone, a moment later) is refused instead of making a second entry.
  room.savedDrawings.add(key);
  accounts
    .saveDrawing({
      png,
      gameMode: room.gameMode,
      savedBy: player.userId,
      ...about,
    })
    .catch(() => "failed" as const)
    .then((result) => {
      if (result === "saved") {
        broadcast(room, { type: "drawing-saved", key });
        return;
      }
      room.savedDrawings.delete(key); // free to try again
      refuse(result);
    });
}
