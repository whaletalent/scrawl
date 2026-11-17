import type { Room, Player, GameMode, FaceTemplateOption } from "./types.js";
import { FACE_TEMPLATE_IDS } from "./types.js";
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

const GAME_MODES: GameMode[] = ["party", "split-body", "face-builder"];

function clampInt(value: unknown, fallback: number, min: number, max: number): number {
  const n = typeof value === "number" && Number.isFinite(value) ? Math.round(value) : fallback;
  return Math.min(Math.max(n, min), max);
}

export function sanitizeNickname(nickname: unknown): string {
  const trimmed = typeof nickname === "string" ? nickname.trim().slice(0, 16) : "";
  return trimmed || "Player";
}

function newPlayer(id: string, nickname: string, ws: WebSocket): Player {
  return {
    id,
    nickname: sanitizeNickname(nickname),
    score: 0,
    isHost: false,
    ws,
    token: crypto.randomUUID(),
    connected: true,
    graceTimer: null,
  };
}

export function createRoom(nickname: string, ws: WebSocket, requestedMode: GameMode = "party", totalRounds?: number, turnDuration?: number, faceTemplate?: FaceTemplateOption, skinTone?: string): Room {
  const code = generateCode();
  const playerId = crypto.randomUUID();
  const host: Player = { ...newPlayer(playerId, nickname, ws), isHost: true };

  // Everything below comes straight from the client — never trust it.
  const gameMode = GAME_MODES.includes(requestedMode) ? requestedMode : "party";
  const clampedRounds = clampInt(totalRounds, 3, 1, 5);
  const clampedTurnDuration = clampInt(turnDuration, 90, 15, 300);

  const validatedTemplate: FaceTemplateOption =
    faceTemplate === "random" || FACE_TEMPLATE_IDS.includes(faceTemplate as never)
      ? (faceTemplate as FaceTemplateOption)
      : "random";
  const validatedSkinTone =
    typeof skinTone === "string" && /^#[0-9a-fA-F]{6}$/.test(skinTone) ? skinTone : "#FDDCB5";

  const room: Room = {
    code,
    phase: "lobby",
    round: 0,
    totalRounds: clampedRounds,
    gameMode,
    turnDuration: clampedTurnDuration,
    splitDrawings: [],
    faceTemplate: validatedTemplate,
    skinTone: validatedSkinTone,
    faceDrawings: [],
    players: new Map([[playerId, host]]),
    themes: [],
    pairs: [],
    drawings: [],
    results: [],
    allResults: [],
    sitOutCounts: new Map(),
    phaseTimer: null,
    phaseEndsAt: 0,
  };

  rooms.set(code, room);
  return room;
}

export function joinRoom(code: string, nickname: string, ws: WebSocket): { room: Room; playerId: string } | null {
  const room = rooms.get(String(code).trim().toUpperCase());
  if (!room) return null;
  if (room.phase !== "lobby") return null;
  const maxPlayers = room.gameMode === "party" ? 10 : 2;
  if (room.players.size >= maxPlayers) return null;

  const playerId = crypto.randomUUID();
  const player = newPlayer(playerId, nickname, ws);
  room.players.set(playerId, player);

  return { room, playerId };
}

export function removePlayer(roomCode: string, playerId: string): Room | null {
  const room = rooms.get(roomCode);
  if (!room) return null;

  const leaving = room.players.get(playerId);
  if (leaving?.graceTimer) clearTimeout(leaving.graceTimer);
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
  return rooms.get(String(code).trim().toUpperCase());
}

/** What clients are allowed to know about a player (no socket, no token). */
export function publicPlayer({ id, nickname, score, isHost, connected }: Player) {
  return { id, nickname, score, isHost, connected };
}

export function publicPlayers(room: Room) {
  return Array.from(room.players.values()).map(publicPlayer);
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
