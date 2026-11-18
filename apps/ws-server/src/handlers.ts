import type { WebSocket } from "ws";
import type { ClientMessage } from "./types.js";
import {
  createRoom,
  joinRoom,
  removePlayer,
  getRoom,
  broadcast,
  publicPlayer,
  publicPlayers,
} from "./room-manager.js";
import type { Room } from "./types.js";
import { config } from "./config.js";
import {
  startGame,
  startSplitGame,
  handleSplitDrawingSubmit,
  startFaceGame,
  handleFaceDrawingSubmit,
  handlePlayerLeft,
  resyncPlayer,
} from "./game-engine.js";

const wsToPlayer = new Map<WebSocket, { playerId: string; roomCode: string }>();

/** The socket dropped: keep the slot for a grace period so the player can `rejoin`. */
function handleDisconnect(ws: WebSocket) {
  const info = wsToPlayer.get(ws);
  if (!info) return;
  wsToPlayer.delete(ws);

  const room = getRoom(info.roomCode);
  const player = room?.players.get(info.playerId);
  // A stale socket closing after the player already rejoined on a new one.
  if (!room || !player || player.ws !== ws) return;

  player.connected = false;
  broadcast(room, {
    type: "player-connection",
    playerId: player.id,
    connected: false,
  });
  player.graceTimer = setTimeout(
    () => dropPlayer(info.roomCode, info.playerId),
    config.reconnectGraceMs,
  );
}

/** Grace period over: the player is gone for good. */
function dropPlayer(roomCode: string, playerId: string) {
  const room = removePlayer(roomCode, playerId);
  if (!room) return;
  // removePlayer may have promoted a new host — tell the clients who.
  const hostId = Array.from(room.players.values()).find((p) => p.isHost)?.id;
  broadcast(room, { type: "player-left", playerId, hostId });
  handlePlayerLeft(room);
}

function sendRoomState(ws: WebSocket, room: Room, playerId: string) {
  ws.send(
    JSON.stringify({
      type: "room-state",
      state: serializeRoomState(room),
      playerId,
      sessionToken: room.players.get(playerId)?.token,
    }),
  );
}

function handleRejoin(ws: WebSocket, roomCode: string, token: string) {
  const room = getRoom(roomCode);
  const player =
    room && Array.from(room.players.values()).find((p) => p.token === token);
  if (!room || !player || typeof token !== "string") {
    ws.send(JSON.stringify({ type: "rejoin-failed" }));
    return;
  }

  if (player.graceTimer) clearTimeout(player.graceTimer);
  player.graceTimer = null;

  // Same player on a second socket (e.g. the old one hasn't noticed it's dead).
  const oldWs = player.ws;
  if (oldWs !== ws) {
    wsToPlayer.delete(oldWs);
    // Tell the old tab to stand down, or its auto-reconnect would fight us for the slot.
    if (oldWs.readyState === oldWs.OPEN)
      oldWs.send(JSON.stringify({ type: "session-replaced" }));
    oldWs.close();
  }

  player.ws = ws;
  player.connected = true;
  wsToPlayer.set(ws, { playerId: player.id, roomCode: room.code });

  sendRoomState(ws, room, player.id);
  resyncPlayer(room, player.id);
  broadcast(
    room,
    { type: "player-connection", playerId: player.id, connected: true },
    player.id,
  );
}

export function handleConnection(ws: WebSocket) {
  ws.on("message", (raw) => {
    try {
      const msg = JSON.parse(raw.toString()) as ClientMessage;
      handleMessage(ws, msg);
    } catch {
      ws.send(JSON.stringify({ type: "error", message: "Mensagem inválida" }));
    }
  });

  ws.on("close", () => handleDisconnect(ws));
}

function handleMessage(ws: WebSocket, msg: ClientMessage) {
  switch (msg.type) {
    case "create-room":
      handleCreateRoom(ws, msg);
      break;
    case "join-room":
      handleJoinRoom(ws, msg.roomCode, msg.nickname);
      break;
    case "rejoin":
      handleRejoin(ws, msg.roomCode, msg.token);
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
    case "submit-face-drawing":
      handleSubmitFaceDrawing(ws, msg.imageDataUrl);
      break;
  }
}

function handleCreateRoom(
  ws: WebSocket,
  msg: Extract<ClientMessage, { type: "create-room" }>,
) {
  const room = createRoom(
    msg.nickname,
    ws,
    msg.gameMode,
    msg.totalRounds,
    msg.turnDuration,
    msg.faceTemplate,
    msg.skinTone,
  );
  const hostId = Array.from(room.players.keys())[0];
  wsToPlayer.set(ws, { playerId: hostId, roomCode: room.code });
  sendRoomState(ws, room, hostId);
}

function handleJoinRoom(ws: WebSocket, roomCode: string, nickname: string) {
  const result = joinRoom(roomCode, nickname, ws);
  if (!result) {
    ws.send(
      JSON.stringify({
        type: "error",
        message: "Sala não encontrada, cheia ou já iniciada",
      }),
    );
    return;
  }

  const { room, playerId } = result;
  wsToPlayer.set(ws, { playerId, roomCode: room.code });
  sendRoomState(ws, room, playerId);

  broadcast(
    room,
    {
      type: "player-joined",
      player: publicPlayer(room.players.get(playerId)!),
    },
    playerId,
  );
}

function handleStartGame(ws: WebSocket) {
  const info = wsToPlayer.get(ws);
  if (!info) return;

  const room = getRoom(info.roomCode);
  if (!room) return;

  const player = room.players.get(info.playerId);
  if (!player?.isHost) {
    ws.send(
      JSON.stringify({
        type: "error",
        message: "Só o host pode iniciar o jogo",
      }),
    );
    return;
  }

  if (room.gameMode === "split-body") {
    if (room.players.size !== 2) {
      ws.send(
        JSON.stringify({
          type: "error",
          message: "O modo Split Body precisa de exatamente 2 jogadores",
        }),
      );
      return;
    }
    startSplitGame(room);
  } else if (room.gameMode === "face-builder") {
    if (room.players.size !== 2) {
      ws.send(
        JSON.stringify({
          type: "error",
          message: "O modo Face Builder precisa de exatamente 2 jogadores",
        }),
      );
      return;
    }
    startFaceGame(room);
  } else {
    if (room.players.size < 4) {
      ws.send(
        JSON.stringify({
          type: "error",
          message: "São necessários pelo menos 4 jogadores para começar",
        }),
      );
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
    theme: {
      id: theme.id,
      text: theme.text,
      authorId: theme.authorId,
      votes: 0,
    },
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
    (count, t) => count + (t.votes.includes(info.playerId) ? 1 : 0),
    0,
  );
  if (playerVoteCount >= 2) return;

  theme.votes.push(info.playerId);

  broadcast(room, {
    type: "theme-votes-update",
    themes: room.themes.map((t) => ({
      id: t.id,
      text: t.text,
      authorId: t.authorId,
      votes: t.votes.length,
    })),
  });
}

function handleSubmitDrawing(ws: WebSocket, imageDataUrl: string) {
  const info = wsToPlayer.get(ws);
  if (!info) return;

  const room = getRoom(info.roomCode);
  if (!room || room.phase !== "drawing") return;

  const pair = room.pairs.find(
    (p) => p.playerA === info.playerId || p.playerB === info.playerId,
  );
  if (!pair) return;

  const side = pair.playerA === info.playerId ? "left" : "right";

  const existing = room.drawings.find(
    (d) => d.pairId === pair.id && d.playerId === info.playerId,
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

function handleSubmitFaceDrawing(ws: WebSocket, imageDataUrl: string) {
  const info = wsToPlayer.get(ws);
  if (!info) return;
  const room = getRoom(info.roomCode);
  if (!room || room.phase !== "face-drawing") return;
  handleFaceDrawingSubmit(room, info.playerId, imageDataUrl);
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
    (p) => p.playerA === info.playerId || p.playerB === info.playerId,
  );
  if (ownPair?.id === pairId) return;

  const result = room.results.find((r) => r.pairId === pairId);
  if (!result) return;

  const rankKey = rank === 1 ? "first" : rank === 2 ? "second" : "third";

  // Each rank goes to a single pair: take it away from whoever held it.
  for (const other of room.results) {
    const vote = other.votes[info.playerId];
    if (vote) vote[rankKey] = "";
  }

  // Each pair holds a single rank: replace any rank this pair had before.
  const vote = { first: "", second: "", third: "" };
  vote[rankKey] = pairId;
  result.votes[info.playerId] = vote;
}

function serializeRoomState(room: ReturnType<typeof getRoom>) {
  if (!room) return null;
  return {
    code: room.code,
    gameMode: room.gameMode,
    faceTemplate: room.faceTemplate,
    skinTone: room.skinTone,
    turnDuration: room.turnDuration,
    phase: room.phase,
    round: room.round,
    totalRounds: room.totalRounds,
    players: publicPlayers(room),
    themes: room.themes.map((t) => ({
      id: t.id,
      text: t.text,
      authorId: t.authorId,
      votes: t.votes.length,
    })),
    pairs: room.pairs,
    drawings: [],
    phaseEndsAt: room.phaseEndsAt,
  };
}
