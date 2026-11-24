// Live strips: neighbours share a 100-px strip of the canvas. Each browser
// sends its own layer cropped to that strip (`strip-frame`); the server relays
// it only to the member across the strip and keeps the latest one per
// (group, strip, member) for rejoin and for the round's results.

import type { Room } from "./types.js";
import { sendTo } from "./room-manager.js";
import { neighbourAcross, stripsOf } from "./seam-geometry.js";

/** Longest `imageDataUrl` a strip frame may have, in characters. */
export const MAX_STRIP_FRAME = 150_000;
/** Most frames a player may send per strip per second; the rest are dropped. */
export const STRIP_FPS = 15;

const PNG_PREFIX = "data:image/png;base64,";

/** A kept frame as a player gets it back on rejoin. */
export type StripFrameOut = {
  strip: number;
  playerId: string;
  imageDataUrl: string;
};

/** A kept frame as it goes into a result: `member` is the index in the group. */
export type KeptFrame = { strip: number; member: number; imageDataUrl: string };

/**
 * The group behind a player's current drawing turn, members left to right.
 * A Racha-tema pair is a group of 2: `[playerA, playerB]`, id = pair id.
 */
function groupOf(
  room: Room,
  playerId: string,
): { id: string; members: string[] } | null {
  if (room.gameMode === "seam") {
    return room.seamGroups.find((g) => g.members.includes(playerId)) ?? null;
  }
  if (room.gameMode === "party") {
    const pair = room.pairs.find(
      (p) => p.playerA === playerId || p.playerB === playerId,
    );
    return pair ? { id: pair.id, members: [pair.playerA, pair.playerB] } : null;
  }
  return null;
}

const frameKey = (groupId: string, strip: number, member: number) =>
  `${groupId}:${strip}:${member}`;

/** Timestamps of the accepted frames of the last second, per "playerId:strip". */
const recentFrames = new WeakMap<Room, Map<string, number[]>>();

function withinRate(room: Room, playerId: string, strip: number): boolean {
  let perRoom = recentFrames.get(room);
  if (!perRoom) recentFrames.set(room, (perRoom = new Map()));
  const key = `${playerId}:${strip}`;
  const now = Date.now();
  const recent = (perRoom.get(key) ?? []).filter((t) => now - t < 1000);
  if (recent.length >= STRIP_FPS) {
    perRoom.set(key, recent);
    return false;
  }
  recent.push(now);
  perRoom.set(key, recent);
  return true;
}

/**
 * A `strip-frame` from a player. Accepted only in the drawing turn of a mode
 * with strips (`seam-drawing`, party `drawing`) — also during the grace after
 * `time-up`, so the last strokes before the layer is sent still reach the
 * neighbour — for exactly the round being played, on a strip the sender
 * touches, as a PNG data URL of at most MAX_STRIP_FRAME chars, and at most
 * STRIP_FPS per strip per second. Anything else is dropped silently.
 */
export function handleStripFrame(
  room: Room,
  playerId: string,
  msg: { round: unknown; strip: unknown; imageDataUrl: unknown },
): void {
  const { round, strip, imageDataUrl } = msg;
  const drawing =
    (room.gameMode === "seam" && room.phase === "seam-drawing") ||
    (room.gameMode === "party" && room.phase === "drawing");
  if (!drawing || round !== room.round) return;
  if (typeof strip !== "number" || !Number.isInteger(strip)) return;
  if (
    typeof imageDataUrl !== "string" ||
    !imageDataUrl.startsWith(PNG_PREFIX) ||
    imageDataUrl.length > MAX_STRIP_FRAME
  )
    return;

  const group = groupOf(room, playerId);
  const size = group?.members.length;
  if (!group || (size !== 2 && size !== 3)) return;
  const member = group.members.indexOf(playerId);
  const neighbour = neighbourAcross(size, member, strip);
  if (neighbour === null) return;
  if (!withinRate(room, playerId, strip)) return;

  room.stripFrames.set(frameKey(group.id, strip, member), imageDataUrl);
  sendTo(room, group.members[neighbour], {
    type: "strip-frame",
    round: room.round,
    strip,
    playerId,
    imageDataUrl,
  });
}

/** Every kept frame of a group, for its result. Members who left keep theirs. */
export function keptFrames(room: Room, groupId: string): KeptFrame[] {
  const frames: KeptFrame[] = [];
  for (const [key, imageDataUrl] of room.stripFrames) {
    const [id, strip, member] = key.split(":");
    if (id === groupId)
      frames.push({
        strip: Number(strip),
        member: Number(member),
        imageDataUrl,
      });
  }
  return frames;
}

/**
 * The kept frames on the strips a player touches — the neighbours' and their
 * own — for a player who comes back mid-turn. Empty at the start of a round.
 */
export function framesFor(
  room: Room,
  groupId: string,
  members: string[],
  playerId: string,
): StripFrameOut[] {
  const size = members.length;
  if (size !== 2 && size !== 3) return [];
  // Each strip has two members: whoever touches it sees both sides' frames.
  const mine = stripsOf(size, members.indexOf(playerId));
  return keptFrames(room, groupId)
    .filter((f) => mine.includes(f.strip))
    .map((f) => ({
      strip: f.strip,
      playerId: members[f.member],
      imageDataUrl: f.imageDataUrl,
    }));
}

/** A new round (or a new game): last round's frames are gone. */
export function clearStripFrames(room: Room): void {
  room.stripFrames.clear();
  recentFrames.delete(room);
}
