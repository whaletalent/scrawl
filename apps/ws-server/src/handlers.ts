import type { WebSocket } from "ws";
import type { ClientMessage } from "./types.js";
import { createRoom, joinRoom, removePlayer, getRoom, broadcast, sendTo } from "./room-manager.js";
import { startGame, startSplitGame, handleSplitDrawingSubmit } from "./game-engine.js";

const wsToPlayer = new Map<WebSocket, { playerId: string; roomCode: string }>();

export function handleConnection(ws: WebSocket) {
  ws.on("message", (raw) => {
    try {
      const msg = JSON.parse(raw.toString()) as ClientMessage;
      handleMessage(ws, msg);
    } catch {
      ws.send(JSON.stringify({ type: "error", message: "Invalid message format" }));
    }
  });

  ws.on("close", () => {
    const info = wsToPlayer.get(ws);
    if (info) {
      const room = removePlayer(info.roomCode, info.playerId);
      if (room) {
        broadcast(room, { type: "player-left", playerId: info.playerId });
      }
      wsToPlayer.delete(ws);
    }
  });
}

function handleMessage(ws: WebSocket, msg: ClientMessage) {
  switch (msg.type) {
    case "create-room":
      handleCreateRoom(ws, msg);
      break;
    case "join-room":
      handleJoinRoom(ws, msg.roomCode, msg.nickname);
      break;
    case "start-game":
      handleStartGame(ws);
      break;
    case "submit-theme":
      handleSubmitTheme(ws, msg.text);
      break;
    case "vote-theme":
      handleVoteTheme(ws, msg.themeId);
      break;
    case "submit-drawing":
      handleSubmitDrawing(ws, msg.imageDataUrl);
      break;
    case "vote-drawing":
      handleVoteDrawing(ws, msg.pairId, msg.rank);
      break;
    case "submit-split-drawing":
      handleSubmitSplitDrawing(ws, msg.imageDataUrl);
      break;
  }
}

function handleCreateRoom(ws: WebSocket, msg: Extract<ClientMessage, { type: "create-room" }>) {
  const room = createRoom(msg.nickname, ws, msg.gameMode, msg.totalRounds, msg.turnDuration);
  const hostId = Array.from(room.players.keys())[0];
  wsToPlayer.set(ws, { playerId: hostId, roomCode: room.code });

  const state = serializeRoomState(room);
  ws.send(JSON.stringify({ type: "room-state", state, playerId: hostId }));
}

function handleJoinRoom(ws: WebSocket, roomCode: string, nickname: string) {
  const result = joinRoom(roomCode, nickname, ws);
  if (!result) {
    ws.send(JSON.stringify({ type: "error", message: "Room not found, full, or already started" }));
    return;
  }

  const { room, playerId } = result;
  wsToPlayer.set(ws, { playerId, roomCode: room.code });

  const state = serializeRoomState(room);
  ws.send(JSON.stringify({ type: "room-state", state, playerId }));

  const player = room.players.get(playerId)!;
  broadcast(room, {
    type: "player-joined",
    player: { id: player.id, nickname: player.nickname, score: player.score, isHost: player.isHost },
  }, playerId);
}

function handleStartGame(ws: WebSocket) {
  const info = wsToPlayer.get(ws);
  if (!info) return;

  const room = getRoom(info.roomCode);
  if (!room) return;

  const player = room.players.get(info.playerId);
  if (!player?.isHost) {
    ws.send(JSON.stringify({ type: "error", message: "Only the host can start the game" }));
    return;
  }

  if (room.gameMode === "split-body") {
    if (room.players.size !== 2) {
      ws.send(JSON.stringify({ type: "error", message: "Split Body mode requires exactly 2 players" }));
      return;
    }
    startSplitGame(room);
  } else {
    if (room.players.size < 4) {
      ws.send(JSON.stringify({ type: "error", message: "Need at least 4 players to start" }));
      return;
    }
    startGame(room);
  }
}

function handleSubmitTheme(ws: WebSocket, text: string) {
  const info = wsToPlayer.get(ws);
  if (!info) return;

  const room = getRoom(info.roomCode);
  if (!room || room.phase !== "theme-creation") return;

  const trimmed = text.trim().slice(0, 100);
  if (!trimmed) return;

  const maxThemes = room.players.size < 6 ? 2 : 1;
  const playerThemes = room.themes.filter((t) => t.authorId === info.playerId);
  if (playerThemes.length >= maxThemes) return;

  const theme = {
    id: crypto.randomUUID(),
    text: trimmed,
    authorId: info.playerId,
    votes: [] as string[],
  };

  room.themes.push(theme);

  broadcast(room, {
    type: "theme-submitted",
    theme: { id: theme.id, text: theme.text, authorId: theme.authorId, votes: 0 },
  });
}

function handleVoteTheme(ws: WebSocket, themeId: string) {
  const info = wsToPlayer.get(ws);
  if (!info) return;

  const room = getRoom(info.roomCode);
  if (!room || room.phase !== "theme-voting") return;

  const theme = room.themes.find((t) => t.id === themeId);
  if (!theme) return;
  if (theme.authorId === info.playerId) return;
  if (theme.votes.includes(info.playerId)) return;

  const playerVoteCount = room.themes.reduce(
    (count, t) => count + (t.votes.includes(info.playerId) ? 1 : 0), 0
  );
  if (playerVoteCount >= 2) return;

  theme.votes.push(info.playerId);

  broadcast(room, {
    type: "theme-votes-update",
    themes: room.themes.map((t) => ({
      id: t.id, text: t.text, authorId: t.authorId, votes: t.votes.length,
    })),
  });
}

function handleSubmitDrawing(ws: WebSocket, imageDataUrl: string) {
  const info = wsToPlayer.get(ws);
  if (!info) return;

  const room = getRoom(info.roomCode);
  if (!room || room.phase !== "drawing") return;

  const pair = room.pairs.find(
    (p) => p.playerA === info.playerId || p.playerB === info.playerId
  );
  if (!pair) return;

  const side = pair.playerA === info.playerId ? "left" : "right";

  const existing = room.drawings.find(
    (d) => d.pairId === pair.id && d.playerId === info.playerId
  );
  if (existing) return;

  room.drawings.push({
    pairId: pair.id,
    playerId: info.playerId,
    side,
    imageDataUrl,
  });

  broadcast(room, { type: "drawing-submitted", pairId: pair.id, side });
}

function handleSubmitSplitDrawing(ws: WebSocket, imageDataUrl: string) {
  const info = wsToPlayer.get(ws);
  if (!info) return;

  const room = getRoom(info.roomCode);
  if (!room || room.phase !== "split-drawing") return;

  handleSplitDrawingSubmit(room, info.playerId, imageDataUrl);
}

function handleVoteDrawing(ws: WebSocket, pairId: string, rank: 1 | 2 | 3) {
  const info = wsToPlayer.get(ws);
  if (!info) return;

  const room = getRoom(info.roomCode);
  if (!room || room.phase !== "drawing-voting") return;

  const ownPair = room.pairs.find(
    (p) => p.playerA === info.playerId || p.playerB === info.playerId
  );
  if (ownPair?.id === pairId) return;

  const result = room.results.find((r) => r.pairId === pairId);
  if (!result) return;

  if (!result.votes[info.playerId]) {
    result.votes[info.playerId] = { first: "", second: "", third: "" };
  }

  const rankKey = rank === 1 ? "first" : rank === 2 ? "second" : "third";
  result.votes[info.playerId][rankKey] = pairId;
}

function serializeRoomState(room: ReturnType<typeof getRoom>) {
  if (!room) return null;
  return {
    code: room.code,
    gameMode: room.gameMode,
    turnDuration: room.turnDuration,
    phase: room.phase,
    round: room.round,
    totalRounds: room.totalRounds,
    players: Array.from(room.players.values()).map(({ id, nickname, score, isHost }) => ({
      id, nickname, score, isHost,
    })),
    themes: room.themes.map((t) => ({
      id: t.id, text: t.text, authorId: t.authorId, votes: t.votes.length,
    })),
    pairs: room.pairs,
    drawings: [],
    phaseEndsAt: room.phaseEndsAt,
  };
}
