import type { DrawingRef, Player, Room } from "./types.js";
import { getAccounts, type GalleryEntry } from "./accounts.js";
import { broadcast } from "./room-manager.js";

/** Largest image a player may put in the gallery (a composed 800×600 PNG is far smaller). */
export const MAX_SAVED_IMAGE_BYTES = 1_500_000;

const PNG_SIGNATURE = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);
const PNG_PREFIX = "data:image/png;base64,";
const DRAWING_WIDTH = 800;
const DRAWING_HEIGHT = 600;

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
  // The first chunk of a PNG is its header, with the image size. The game's
  // canvas is 800×600; anything else isn't a drawing from it (and a huge
  // image would be decoded by every browser that opens the gallery).
  if (
    png.length < 24 ||
    png.toString("ascii", 12, 16) !== "IHDR" ||
    png.readUInt32BE(16) !== DRAWING_WIDTH ||
    png.readUInt32BE(20) !== DRAWING_HEIGHT
  )
    return null;
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
  // Names come from the roster, which remembers players who have left
  // (a result's own `playerNames` says "?" for someone who dropped mid-round).
  const authors = (playerIds: string[]) => ({
    authorNames: playerIds.map((id) => room.roster.get(id)?.nickname ?? "?"),
    authorIds: playerIds.map((id) => room.roster.get(id)?.userId ?? null),
  });

  if (room.phase === "final-results") {
    if (!ref.pairId) return null;
    const result = room.allResults.find(
      (r) => r.round === ref.round && r.pairId === ref.pairId,
    );
    const playerIds = room.resultAuthors.get(drawingKey(ref));
    if (!result || !playerIds) return null;
    return { theme: result.themeText, ...authors(playerIds) };
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
  if (
    !accounts?.saveDrawing ||
    !player.userId ||
    !about ||
    room.savedDrawings.has(key) ||
    room.savingDrawings.has(key)
  )
    return refuse("not-allowed");
  // Decoded last: it is the only costly check, and everything above is free.
  const png = decodePng(imageDataUrl);
  if (!png) return refuse("not-allowed");

  // Claimed before the write, so a second save of the same drawing (from
  // anyone, a moment later) is refused instead of making a second entry.
  // It only counts as saved — and is only announced — once the write is done.
  room.savingDrawings.add(key);
  accounts
    .saveDrawing({
      png,
      gameMode: room.gameMode,
      savedBy: player.userId,
      ...about,
    })
    .catch(() => "failed" as const)
    .then((result) => {
      room.savingDrawings.delete(key);
      if (result === "saved") {
        room.savedDrawings.add(key);
        broadcast(room, { type: "drawing-saved", key });
      } else refuse(result); // free to try again
    })
    // Nothing in here may become an unhandled rejection: that would take the
    // whole server, and every room, down.
    .catch((err) => console.warn(`[gallery] ${String(err)}`));
}
