import type { Room, Player, GameMode, FaceTemplateId } from "./types.js";
import type { WebSocket } from "ws";

const rooms = new Map<string, Room>();

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 5; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return rooms.has(code) ? generateCode() : code;
}

export function createRoom(nickname: string, ws: WebSocket, gameMode: GameMode = "party", totalRounds?: number, turnDuration?: number, faceTemplate?: FaceTemplateId, skinTone?: string): Room {
  const code = generateCode();
  const playerId = crypto.randomUUID();
  const host: Player = { id: playerId, nickname, score: 0, isHost: true, ws };

  const clampedRounds = gameMode === "split-body"
    ? Math.min(Math.max(totalRounds ?? 3, 1), 5)
    : totalRounds ?? 3;

  const clampedTurnDuration = Math.min(Math.max(turnDuration ?? 90, 15), 300);

  const validatedTemplate = faceTemplate ?? "masculine";

  const room: Room = {
    code,
    phase: "lobby",
    round: 0,
    totalRounds: clampedRounds,
    gameMode,
    turnDuration: clampedTurnDuration,
    splitDrawings: [],
    faceTemplate: validatedTemplate,
    skinTone: skinTone ?? "#FDDCB5",
    faceDrawings: [],
    players: new Map([[playerId, host]]),
    themes: [],
    pairs: [],
    drawings: [],
    results: [],
    phaseTimer: null,
    phaseEndsAt: 0,
  };

  rooms.set(code, room);
  return room;
}

export function joinRoom(code: string, nickname: string, ws: WebSocket): { room: Room; playerId: string } | null {
  const room = rooms.get(code);
  if (!room) return null;
  if (room.phase !== "lobby") return null;
  if (room.players.size >= 10) return null;

  const playerId = crypto.randomUUID();
  const player: Player = { id: playerId, nickname, score: 0, isHost: false, ws };
  room.players.set(playerId, player);

  return { room, playerId };
}

export function removePlayer(roomCode: string, playerId: string): Room | null {
  const room = rooms.get(roomCode);
  if (!room) return null;

  room.players.delete(playerId);

  if (room.players.size === 0) {
    if (room.phaseTimer) clearTimeout(room.phaseTimer);
    rooms.delete(roomCode);
    return null;
  }

  const hasHost = Array.from(room.players.values()).some((p) => p.isHost);
  if (!hasHost) {
    const firstPlayer = room.players.values().next().value;
    if (firstPlayer) firstPlayer.isHost = true;
  }

  return room;
}

export function getRoom(code: string): Room | undefined {
  return rooms.get(code);
}

export function broadcast(room: Room, message: object, excludeId?: string) {
  const data = JSON.stringify(message);
  for (const [id, player] of room.players) {
    if (id !== excludeId && player.ws.readyState === player.ws.OPEN) {
      player.ws.send(data);
    }
  }
}

export function sendTo(room: Room, playerId: string, message: object) {
  const player = room.players.get(playerId);
  if (player && player.ws.readyState === player.ws.OPEN) {
    player.ws.send(JSON.stringify(message));
  }
}
