import type { WebSocket } from "ws";
import type { PublicRoom, Room } from "./types.js";
import { allRooms, roomCapacity } from "./room-manager.js";

/** Sockets on the home page, mapped to the last list each was sent. */
const watchers = new Map<WebSocket, string>();

/**
 * A room is on the list while strangers can actually get into it: public,
 * still in the lobby, with a free seat, and a host who is there to start it
 * (a host inside the reconnect grace period hides the room until they're back).
 */
function entryOf(room: Room): PublicRoom | null {
  if (!room.isPublic || room.phase !== "lobby") return null;
  const capacity = roomCapacity(room);
  if (room.players.size >= capacity) return null;
  const host = Array.from(room.players.values()).find((p) => p.isHost);
  if (!host?.connected) return null;

  // Exactly these fields: this goes to anyone who asks.
  return {
    code: room.code,
    hostName: host.nickname,
    ...(host.avatarUrl ? { hostAvatarUrl: host.avatarUrl } : {}),
    gameMode: room.gameMode,
    playerCount: room.players.size,
    capacity,
  };
}

/** Oldest room first. */
export function listPublicRooms(): PublicRoom[] {
  const rooms: PublicRoom[] = [];
  for (const room of allRooms()) {
    const entry = entryOf(room);
    if (entry) rooms.push(entry);
  }
  return rooms;
}

function sendList(ws: WebSocket, data: string) {
  if (ws.readyState !== ws.OPEN) {
    watchers.delete(ws);
    return;
  }
  watchers.set(ws, data);
  ws.send(data);
}

/** Starts sending this socket the list: now, and again whenever it changes. */
export function watchRooms(ws: WebSocket) {
  sendList(
    ws,
    JSON.stringify({ type: "public-rooms", rooms: listPublicRooms() }),
  );
}

export function unwatchRooms(ws: WebSocket) {
  watchers.delete(ws);
}

/** Call after anything that may change the list; only watchers whose list differs hear about it. */
export function publishRooms() {
  if (watchers.size === 0) return;
  const data = JSON.stringify({
    type: "public-rooms",
    rooms: listPublicRooms(),
  });
  for (const [ws, last] of watchers) if (last !== data) sendList(ws, data);
}
