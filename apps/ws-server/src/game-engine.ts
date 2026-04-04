import type { Room, Phase, Pair, DrawingResult } from "./types.js";
import { broadcast } from "./room-manager.js";

const PHASE_DURATIONS: Record<string, number> = {
  "theme-creation": 30_000,
  "theme-voting": 20_000,
  drawing: 90_000,
  "drawing-voting": 20_000,
  reveal: 10_000,
  scoreboard: 8_000,
};

export function startGame(room: Room) {
  if (room.players.size < 4) return;
  room.round = 1;
  transitionTo(room, "theme-creation");
}

export function transitionTo(room: Room, phase: Phase) {
  if (room.phaseTimer) clearTimeout(room.phaseTimer);

  room.phase = phase;
  const duration = PHASE_DURATIONS[phase] ?? 0;
  room.phaseEndsAt = duration > 0 ? Date.now() + duration : 0;

  broadcast(room, {
    type: "phase-change",
    phase,
    phaseEndsAt: room.phaseEndsAt,
  });

  if (duration > 0) {
    room.phaseTimer = setTimeout(() => onPhaseEnd(room), duration);
  }
}

function onPhaseEnd(room: Room) {
  switch (room.phase) {
    case "theme-creation":
      processThemes(room);
      break;
    case "theme-voting":
      selectTopThemesAndPair(room);
      break;
    case "drawing":
      processDrawings(room);
      break;
    case "drawing-voting":
      processDrawingVotes(room);
      break;
    case "reveal":
      transitionTo(room, "scoreboard");
      break;
    case "scoreboard":
      nextRoundOrEnd(room);
      break;
  }
}

function processThemes(room: Room) {
  if (room.themes.length === 0) {
    room.themes.push({
      id: crypto.randomUUID(),
      text: "A cat riding a unicorn",
      authorId: "system",
      votes: [],
    });
  }

  const playerCount = room.players.size;
  if (playerCount <= 4) {
    assignPairs(room, room.themes);
    transitionTo(room, "drawing");
  } else {
    transitionTo(room, "theme-voting");
  }
}

function selectTopThemesAndPair(room: Room) {
  const numPairs = Math.floor(room.players.size / 2);
  const sorted = [...room.themes].sort((a, b) => b.votes.length - a.votes.length);
  const selected = sorted.slice(0, numPairs);

  if (sorted.length > 0 && sorted[0].votes.length > 0) {
    const topAuthorId = sorted[0].authorId;
    const author = room.players.get(topAuthorId);
    if (author) author.score += 1;
  }

  assignPairs(room, selected);
  transitionTo(room, "drawing");
}

function assignPairs(room: Room, themes: typeof room.themes) {
  const playerIds = shuffleArray(Array.from(room.players.keys()));
  const numPairs = Math.floor(playerIds.length / 2);
  room.pairs = [];
  room.drawings = [];

  for (let i = 0; i < numPairs; i++) {
    const theme = themes[i % themes.length];
    const pair: Pair = {
      id: crypto.randomUUID(),
      playerA: playerIds[i * 2],
      playerB: playerIds[i * 2 + 1],
      themeId: theme.id,
    };
    room.pairs.push(pair);
  }

  for (const pair of room.pairs) {
    const theme = room.themes.find((t) => t.id === pair.themeId);
    const pairInfo = {
      type: "pair-assigned" as const,
      pairId: pair.id,
      partnerId: "",
      side: "" as "left" | "right",
      theme: theme?.text ?? "Free draw",
    };

    const playerA = room.players.get(pair.playerA);
    if (playerA?.ws.readyState === playerA?.ws.OPEN) {
      playerA.ws.send(JSON.stringify({ ...pairInfo, partnerId: pair.playerB, side: "left" }));
    }
    const playerB = room.players.get(pair.playerB);
    if (playerB?.ws.readyState === playerB?.ws.OPEN) {
      playerB.ws.send(JSON.stringify({ ...pairInfo, partnerId: pair.playerA, side: "right" }));
    }
  }
}

function processDrawings(room: Room) {
  room.results = room.pairs.map((pair) => {
    const theme = room.themes.find((t) => t.id === pair.themeId);
    const leftDrawing = room.drawings.find((d) => d.pairId === pair.id && d.side === "left");
    const rightDrawing = room.drawings.find((d) => d.pairId === pair.id && d.side === "right");

    return {
      pairId: pair.id,
      themeText: theme?.text ?? "",
      imageLeftDataUrl: leftDrawing?.imageDataUrl ?? "",
      imageRightDataUrl: rightDrawing?.imageDataUrl ?? "",
      combinedImageDataUrl: "",
      votes: {},
    };
  });

  broadcast(room, { type: "drawings-ready", drawings: serializeResults(room.results) });
  transitionTo(room, "drawing-voting");
}

function processDrawingVotes(room: Room) {
  for (const result of room.results) {
    let first = 0, second = 0, third = 0;
    for (const vote of Object.values(result.votes)) {
      if (vote.first === result.pairId) first++;
      if (vote.second === result.pairId) second++;
      if (vote.third === result.pairId) third++;
    }

    const pairScore = first * 3 + second * 2 + third * 1;
    const multiplier = room.round === room.totalRounds ? 2 : 1;
    const finalScore = pairScore * multiplier;

    const pair = room.pairs.find((p) => p.id === result.pairId);
    if (pair) {
      const playerA = room.players.get(pair.playerA);
      const playerB = room.players.get(pair.playerB);
      if (playerA) playerA.score += finalScore;
      if (playerB) playerB.score += finalScore;
    }
  }

  const players = Array.from(room.players.values()).map(({ id, nickname, score, isHost }) => ({
    id, nickname, score, isHost,
  }));

  broadcast(room, {
    type: "reveal-data",
    drawings: serializeResults(room.results),
    players,
  });

  transitionTo(room, "reveal");
}

function nextRoundOrEnd(room: Room) {
  if (room.round >= room.totalRounds) {
    const players = Array.from(room.players.values()).map(({ id, nickname, score, isHost }) => ({
      id, nickname, score, isHost,
    }));
    broadcast(room, {
      type: "final-results",
      players: players.sort((a, b) => b.score - a.score),
      drawings: serializeResults(room.results),
    });
    transitionTo(room, "final-results");
  } else {
    room.round++;
    room.themes = [];
    room.pairs = [];
    room.drawings = [];
    room.results = [];
    transitionTo(room, "theme-creation");
  }
}

function serializeResults(results: DrawingResult[]) {
  return results.map((r) => ({
    ...r,
    votes: {
      first: Object.values(r.votes).filter((v) => v.first === r.pairId).length,
      second: Object.values(r.votes).filter((v) => v.second === r.pairId).length,
      third: Object.values(r.votes).filter((v) => v.third === r.pairId).length,
    },
  }));
}

function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
