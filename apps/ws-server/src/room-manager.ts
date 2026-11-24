import type { Room, Player, GameMode, FaceTemplateOption } from "./types.js";
import { FACE_TEMPLATE_IDS } from "./types.js";
import type { Profile } from "./accounts.js";
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

const GAME_MODES: GameMode[] = ["party", "split-body", "face-builder", "seam"];

function clampInt(
  value: unknown,
  fallback: number,
  min: number,
  max: number,
): number {
  const n =
    typeof value === "number" && Number.isFinite(value)
      ? Math.round(value)
      : fallback;
  return Math.min(Math.max(n, min), max);
}

export function sanitizeNickname(nickname: unknown): string {
  const trimmed =
    typeof nickname === "string" ? nickname.trim().slice(0, 16) : "";
  return trimmed || "Player";
}

/** With a `profile` the player is the account: its username replaces whatever nickname was sent. */
function newPlayer(
  id: string,
  nickname: string,
  ws: WebSocket,
  profile?: Profile | null,
): Player {
  return {
    id,
    nickname: profile ? profile.username : sanitizeNickname(nickname),
    userId: profile?.userId ?? null,
    avatarUrl: profile?.avatarUrl ?? null,
    score: 0,
    isHost: false,
    ws,
    token: crypto.randomUUID(),
    connected: true,
    graceTimer: null,
  };
}

export function createRoom(
  nickname: string,
  ws: WebSocket,
  requestedMode: GameMode = "party",
  totalRounds?: number,
  turnDuration?: number,
  faceTemplate?: FaceTemplateOption,
  skinTone?: string,
  profile?: Profile | null,
  visibility?: unknown,
): Room {
  const code = generateCode();
  const playerId = crypto.randomUUID();
  const host: Player = {
    ...newPlayer(playerId, nickname, ws, profile),
    isHost: true,
  };

  // Everything below comes straight from the client — never trust it.
  const gameMode = GAME_MODES.includes(requestedMode) ? requestedMode : "party";
  const clampedRounds = clampInt(totalRounds, 3, 1, 5);
  const clampedTurnDuration = clampInt(turnDuration, 90, 15, 300);

  const validatedTemplate: FaceTemplateOption =
    faceTemplate === "random" ||
    FACE_TEMPLATE_IDS.includes(faceTemplate as never)
      ? (faceTemplate as FaceTemplateOption)
      : "random";
  const validatedSkinTone =
    typeof skinTone === "string" && /^#[0-9a-fA-F]{6}$/.test(skinTone)
      ? skinTone
      : "#FDDCB5";

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
    seamGroups: [],
    seamDrawings: [],
    players: new Map([[playerId, host]]),
    themes: [],
    pairs: [],
    drawings: [],
    results: [],
    allResults: [],
    sitOutCounts: new Map(),
    phaseTimer: null,
    phaseEndsAt: 0,
    // The list shows the host's username and avatar, so a guest can't host a public room.
    isPublic: Boolean(profile) && visibility === "public",
    roster: new Map([
      [playerId, { nickname: host.nickname, userId: host.userId }],
    ]),
    resultAuthors: new Map(),
    savedDrawings: new Set(),
    savingDrawings: new Set(),
    game: 0,
    collecting: false,
  };

  rooms.set(code, room);
  return room;
}

export function joinRoom(
  code: string,
  nickname: string,
  ws: WebSocket,
  profile?: Profile | null,
): { room: Room; playerId: string } | null {
  const room = rooms.get(String(code).trim().toUpperCase());
  if (!room) return null;
  if (room.phase !== "lobby") return null;
  if (room.players.size >= roomCapacity(room)) return null;

  const playerId = crypto.randomUUID();
  const player = newPlayer(playerId, nickname, ws, profile);
  room.players.set(playerId, player);
  room.roster.set(playerId, {
    nickname: player.nickname,
    userId: player.userId,
  });

  return { room, playerId };
}

/** How many players fit: party and Emenda take up to 10, the other modes exactly 2. */
export function roomCapacity(room: Room): number {
  return room.gameMode === "party" || room.gameMode === "seam" ? 10 : 2;
}

/** Every live room, oldest first. */
export function allRooms(): Iterable<Room> {
  return rooms.values();
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

/** What clients are allowed to know about a player (no socket, no token, no userId). */
export function publicPlayer({
  id,
  nickname,
  score,
  isHost,
  connected,
  avatarUrl,
}: Player) {
  return {
    id,
    nickname,
    score,
    isHost,
    connected,
    // Guests have no avatar key at all.
    ...(avatarUrl ? { avatarUrl } : {}),
  };
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
