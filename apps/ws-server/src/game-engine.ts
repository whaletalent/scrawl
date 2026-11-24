import type {
  Room,
  Phase,
  Pair,
  DrawingResult,
  SplitDrawing,
  FaceDrawing,
  FaceTemplateId,
  SeamDrawing,
  SeamGroup,
} from "./types.js";
import { SILHOUETTE_IDS, FACE_REGION_IDS, FACE_TEMPLATE_IDS } from "./types.js";

const SKIN_TONE_COLORS = [
  "#FDDCB5",
  "#E8B88A",
  "#C68642",
  "#8D5524",
  "#5C3317",
  "#6B8E23",
  "#4682B4",
];
import { broadcast, sendTo, publicPlayers } from "./room-manager.js";
import { config } from "./config.js";
import { clearStripFrames, framesFor, keptFrames } from "./strips.js";

const PHASE_DURATIONS: Record<string, number> = {
  "theme-creation": 30_000,
  "theme-voting": 20_000,
  "drawing-voting": 20_000,
  reveal: 10_000,
  scoreboard: 8_000,
  "seam-reveal": 10_000,
};

function getPhaseDuration(phase: string, room: Room): number {
  const isDrawing =
    phase === "drawing" ||
    phase === "split-drawing" ||
    phase === "face-drawing" ||
    phase === "seam-drawing";
  const base = isDrawing
    ? room.turnDuration * 1000
    : (PHASE_DURATIONS[phase] ?? 0);
  return Math.round(base * config.timeScale);
}

const MIN_PARTY_PLAYERS = 4;

export function startGame(room: Room) {
  if (room.players.size < MIN_PARTY_PLAYERS) return;
  room.round = 1;
  room.allResults = [];
  room.sitOutCounts = new Map();
  transitionTo(room, "theme-creation");
}

export function startSplitGame(room: Room) {
  if (room.players.size !== 2) return;
  room.round = 1;
  room.splitDrawings = [];
  startSplitRound(room);
}

function startSplitRound(room: Room) {
  const playerIds = Array.from(room.players.keys());
  const hostId =
    Array.from(room.players.values()).find((p) => p.isHost)?.id ?? playerIds[0];
  const guestId = playerIds.find((id) => id !== hostId)!;

  const isOddRound = room.round % 2 === 1;
  const topPlayerId = isOddRound ? hostId : guestId;
  const bottomPlayerId = isOddRound ? guestId : hostId;

  const silhouetteId =
    SILHOUETTE_IDS[Math.floor(Math.random() * SILHOUETTE_IDS.length)];

  const drawing: SplitDrawing = {
    round: room.round,
    topPlayerId,
    bottomPlayerId,
    topImageDataUrl: null,
    bottomImageDataUrl: null,
    silhouetteId,
  };
  room.splitDrawings.push(drawing);

  sendSplitRoundStart(room, drawing, topPlayerId);
  sendSplitRoundStart(room, drawing, bottomPlayerId);

  transitionTo(room, "split-drawing");
}

/** Tells the players drawing one picture that one of their drawings reached the server. */
export function announceReceived(room: Room, playerId: string, to: string[]) {
  for (const id of to)
    sendTo(room, id, { type: "drawing-received", round: room.round, playerId });
}

function sendSplitRoundStart(
  room: Room,
  drawing: SplitDrawing,
  playerId: string,
) {
  const isTop = playerId === drawing.topPlayerId;
  sendTo(room, playerId, {
    type: "split-round-start",
    round: drawing.round,
    side: isTop ? "top" : "bottom",
    silhouetteId: drawing.silhouetteId,
    totalRounds: room.totalRounds,
    submitted: !!(isTop ? drawing.topImageDataUrl : drawing.bottomImageDataUrl),
    partnerSubmitted: !!(isTop
      ? drawing.bottomImageDataUrl
      : drawing.topImageDataUrl),
  });
}

function sendFaceRoundStart(
  room: Room,
  drawing: FaceDrawing,
  playerId: string,
) {
  const isP1 = playerId === drawing.player1Id;
  sendTo(room, playerId, {
    type: "face-round-start",
    round: drawing.round,
    regions: drawing.assignments
      .filter((a) => a.playerId === playerId)
      .map((a) => a.regionId),
    faceTemplate: drawing.faceTemplate,
    skinTone: drawing.skinTone,
    totalRounds: room.totalRounds,
    submitted: !!(isP1
      ? drawing.player1ImageDataUrl
      : drawing.player2ImageDataUrl),
    partnerSubmitted: !!(isP1
      ? drawing.player2ImageDataUrl
      : drawing.player1ImageDataUrl),
  });
}

function sendPairAssigned(room: Room, pair: Pair, playerId: string) {
  const isA = playerId === pair.playerA;
  sendTo(room, playerId, {
    type: "pair-assigned",
    pairId: pair.id,
    partnerId: isA ? pair.playerB : pair.playerA,
    side: isA ? "left" : "right",
    theme:
      room.themes.find((t) => t.id === pair.themeId)?.text ?? "Desenho livre",
    submitted: room.drawings.some(
      (d) => d.pairId === pair.id && d.playerId === playerId,
    ),
    partnerSubmitted: room.drawings.some(
      (d) => d.pairId === pair.id && d.playerId !== playerId,
    ),
    // Kept strip frames, partner's and own; none at the start of a round.
    frames: framesFor(room, pair.id, [pair.playerA, pair.playerB], playerId),
  });
}

/**
 * Replays to a player who just reclaimed their slot everything that was sent
 * individually or broadcast while they were away, so their client can render
 * the current phase. Call right after sending them `room-state`.
 */
export function resyncPlayer(room: Room, playerId: string) {
  if (room.gameMode === "seam") {
    resyncSeamPlayer(room, playerId);
    return;
  }
  if (room.gameMode === "split-body") {
    const current = room.splitDrawings.find((d) => d.round === room.round);
    if (room.phase === "split-drawing" && current) {
      sendSplitRoundStart(room, current, playerId);
      if (room.collecting)
        sendTo(room, playerId, { type: "time-up", round: room.round });
    }
    if (room.phase === "split-final")
      sendTo(room, playerId, {
        type: "split-final-results",
        drawings: room.splitDrawings,
      });
    return;
  }
  if (room.gameMode === "face-builder") {
    const current = room.faceDrawings.find((d) => d.round === room.round);
    if (room.phase === "face-drawing" && current) {
      sendFaceRoundStart(room, current, playerId);
      if (room.collecting)
        sendTo(room, playerId, { type: "time-up", round: room.round });
    }
    if (room.phase === "face-final")
      sendTo(room, playerId, {
        type: "face-final-results",
        drawings: room.faceDrawings,
      });
    return;
  }

  const pair = room.pairs.find(
    (p) => p.playerA === playerId || p.playerB === playerId,
  );
  if (pair) sendPairAssigned(room, pair, playerId);
  if (room.collecting)
    sendTo(room, playerId, { type: "time-up", round: room.round });

  if (room.phase === "drawing-voting") {
    sendTo(room, playerId, {
      type: "drawings-ready",
      drawings: serializeResults(room.results),
    });
  } else if (room.phase === "reveal" || room.phase === "scoreboard") {
    sendTo(room, playerId, {
      type: "reveal-data",
      drawings: serializeResults(room.results),
      players: publicPlayers(room),
    });
  } else if (room.phase === "final-results") {
    sendTo(room, playerId, {
      type: "final-results",
      players: publicPlayers(room).sort((a, b) => b.score - a.score),
      drawings: serializeResults(room.allResults),
    });
  }
}

export function startFaceGame(room: Room) {
  if (room.players.size !== 2) return;
  room.round = 1;
  room.faceDrawings = [];
  startFaceRound(room);
}

function startFaceRound(room: Room) {
  const playerIds = Array.from(room.players.keys());
  const [player1Id, player2Id] = playerIds;

  const shuffled = shuffleArray([...FACE_REGION_IDS]);
  const player1Regions = shuffled.slice(0, 3);
  const player2Regions = shuffled.slice(3, 6);

  const assignments = [
    ...player1Regions.map((regionId) => ({ regionId, playerId: player1Id })),
    ...player2Regions.map((regionId) => ({ regionId, playerId: player2Id })),
  ];

  const isRandom = room.faceTemplate === "random";
  const roundTemplate: FaceTemplateId = isRandom
    ? FACE_TEMPLATE_IDS[Math.floor(Math.random() * FACE_TEMPLATE_IDS.length)]
    : (room.faceTemplate as FaceTemplateId);
  const roundSkinTone = isRandom
    ? SKIN_TONE_COLORS[Math.floor(Math.random() * SKIN_TONE_COLORS.length)]
    : room.skinTone;

  const drawing: FaceDrawing = {
    round: room.round,
    faceTemplate: roundTemplate,
    skinTone: roundSkinTone,
    assignments,
    player1Id,
    player2Id,
    player1ImageDataUrl: null,
    player2ImageDataUrl: null,
  };
  room.faceDrawings.push(drawing);

  sendFaceRoundStart(room, drawing, player1Id);
  sendFaceRoundStart(room, drawing, player2Id);

  transitionTo(room, "face-drawing");
}

export function handleFaceDrawingSubmit(
  room: Room,
  playerId: string,
  imageDataUrl: string,
  round?: number,
) {
  if (room.phase !== "face-drawing") {
    console.log(`[face] submit rejected: phase is ${room.phase}`);
    return;
  }
  if (!isCurrentRound(room, round)) {
    console.log(
      `[face] submit rejected: round ${round}, playing ${room.round}`,
    );
    return;
  }

  const currentDrawing = room.faceDrawings.find((d) => d.round === room.round);
  if (!currentDrawing) return;

  if (playerId === currentDrawing.player1Id) {
    if (currentDrawing.player1ImageDataUrl) return;
    currentDrawing.player1ImageDataUrl = imageDataUrl;
    console.log(
      `[face] round ${room.round}: P1 submitted (${imageDataUrl.length} chars)`,
    );
  } else if (playerId === currentDrawing.player2Id) {
    if (currentDrawing.player2ImageDataUrl) return;
    currentDrawing.player2ImageDataUrl = imageDataUrl;
    console.log(
      `[face] round ${room.round}: P2 submitted (${imageDataUrl.length} chars)`,
    );
  } else {
    return;
  }

  announceReceived(room, playerId, [
    currentDrawing.player1Id,
    currentDrawing.player2Id,
  ]);

  if (
    currentDrawing.player1ImageDataUrl &&
    currentDrawing.player2ImageDataUrl
  ) {
    console.log(`[face] round ${room.round}: BOTH submitted, advancing`);
    advanceFaceRound(room);
  }
}

function advanceFaceRound(room: Room) {
  if (room.round >= room.totalRounds) {
    startFaceFinal(room);
  } else {
    broadcast(room, { type: "face-round-end", round: room.round });
    room.round++;
    startFaceRound(room);
  }
}

function startFaceFinal(room: Room) {
  const summary = room.faceDrawings.map((d) => ({
    round: d.round,
    hasP1: !!d.player1ImageDataUrl,
    hasP2: !!d.player2ImageDataUrl,
  }));
  console.log(`[face] FINAL REVEAL:`, JSON.stringify(summary));
  broadcast(room, {
    type: "face-final-results",
    drawings: room.faceDrawings,
  });
  transitionTo(room, "face-final");
}

export function handleSplitDrawingSubmit(
  room: Room,
  playerId: string,
  imageDataUrl: string,
  round?: number,
) {
  if (room.phase !== "split-drawing") {
    console.log(
      `[split] submit rejected: phase is ${room.phase}, not split-drawing`,
    );
    return;
  }
  if (!isCurrentRound(room, round)) {
    console.log(
      `[split] submit rejected: round ${round}, playing ${room.round}`,
    );
    return;
  }

  const currentDrawing = room.splitDrawings.find((d) => d.round === room.round);
  if (!currentDrawing) {
    console.log(`[split] submit rejected: no drawing for round ${room.round}`);
    return;
  }

  if (playerId === currentDrawing.topPlayerId) {
    if (currentDrawing.topImageDataUrl) return;
    currentDrawing.topImageDataUrl = imageDataUrl;
    console.log(
      `[split] round ${room.round}: TOP submitted (${imageDataUrl.length} chars)`,
    );
  } else if (playerId === currentDrawing.bottomPlayerId) {
    if (currentDrawing.bottomImageDataUrl) return;
    currentDrawing.bottomImageDataUrl = imageDataUrl;
    console.log(
      `[split] round ${room.round}: BOTTOM submitted (${imageDataUrl.length} chars)`,
    );
  } else {
    console.log(
      `[split] submit rejected: player ${playerId} not in current drawing`,
    );
    return;
  }

  announceReceived(room, playerId, [
    currentDrawing.topPlayerId,
    currentDrawing.bottomPlayerId,
  ]);

  if (currentDrawing.topImageDataUrl && currentDrawing.bottomImageDataUrl) {
    console.log(`[split] round ${room.round}: BOTH submitted, advancing`);
    advanceSplitRound(room);
  }
}

function advanceSplitRound(room: Room) {
  if (room.round >= room.totalRounds) {
    startSplitFinal(room);
  } else {
    broadcast(room, { type: "split-round-end", round: room.round });
    room.round++;
    startSplitRound(room);
  }
}

function startSplitFinal(room: Room) {
  const summary = room.splitDrawings.map((d) => ({
    round: d.round,
    hasTop: !!d.topImageDataUrl,
    hasBottom: !!d.bottomImageDataUrl,
    topLen: d.topImageDataUrl?.length ?? 0,
    bottomLen: d.bottomImageDataUrl?.length ?? 0,
  }));
  console.log(`[split] FINAL REVEAL:`, JSON.stringify(summary));
  broadcast(room, {
    type: "split-final-results",
    drawings: room.splitDrawings,
  });
  transitionTo(room, "split-final");
}

export function transitionTo(room: Room, phase: Phase) {
  if (room.phaseTimer) clearTimeout(room.phaseTimer);
  room.collecting = false;

  room.phase = phase;
  const duration = getPhaseDuration(phase, room);
  room.phaseEndsAt = duration > 0 ? Date.now() + duration : 0;

  broadcast(room, {
    type: "phase-change",
    phase,
    phaseEndsAt: room.phaseEndsAt,
    round: room.round,
  });

  if (duration > 0) {
    room.phaseTimer = setTimeout(() => onPhaseEnd(room), duration);
  }
}

const DRAWING_PHASES: Phase[] = [
  "drawing",
  "split-drawing",
  "face-drawing",
  "seam-drawing",
];

/**
 * A drawing turn ran out: tell everyone to send what they have, and close the
 * turn a moment later (or as soon as every drawing is in).
 */
function startCollecting(room: Room) {
  room.collecting = true;
  broadcast(room, { type: "time-up", round: room.round });
  room.phaseTimer = setTimeout(() => onPhaseEnd(room), config.submitGraceMs);
}

/** Whether a submitted drawing is for the round being played (untagged ones are). */
export function isCurrentRound(room: Room, round: unknown): boolean {
  return round === undefined || round === room.round;
}

/** Party: closes the drawing turn early once every pair's two halves are in, after time-up. */
export function finishPartyDrawingIfComplete(room: Room) {
  if (room.phase !== "drawing" || !room.collecting) return;
  const complete = room.pairs.every(
    (pair) => room.drawings.filter((d) => d.pairId === pair.id).length === 2,
  );
  if (complete) {
    if (room.phaseTimer) clearTimeout(room.phaseTimer);
    processDrawings(room);
  }
}

function onPhaseEnd(room: Room) {
  if (DRAWING_PHASES.includes(room.phase) && !room.collecting) {
    startCollecting(room);
    return;
  }
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
    case "split-drawing": {
      const currentDrawing = room.splitDrawings.find(
        (d) => d.round === room.round,
      );
      if (currentDrawing) {
        console.log(
          `[split] TIMER EXPIRED round ${room.round}: top=${!!currentDrawing.topImageDataUrl}, bottom=${!!currentDrawing.bottomImageDataUrl}`,
        );
        advanceSplitRound(room);
      }
      break;
    }
    case "face-drawing": {
      const currentDrawing = room.faceDrawings.find(
        (d) => d.round === room.round,
      );
      if (currentDrawing) {
        console.log(
          `[face] TIMER EXPIRED round ${room.round}: p1=${!!currentDrawing.player1ImageDataUrl}, p2=${!!currentDrawing.player2ImageDataUrl}`,
        );
        advanceFaceRound(room);
      }
      break;
    }
    case "seam-drawing":
      endSeamRound(room);
      break;
    case "seam-reveal":
      nextSeamRoundOrEnd(room);
      break;
  }
}

function processThemes(room: Room) {
  if (room.themes.length === 0) {
    room.themes.push({
      id: crypto.randomUUID(),
      text: "Um gato montado em um unicórnio",
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
  const sorted = [...room.themes].sort(
    (a, b) => b.votes.length - a.votes.length,
  );
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

  // Odd player count: one player sits this round out (and judges every
  // drawing). Pick whoever has sat out the least so it rotates.
  if (playerIds.length % 2 === 1) {
    const count = (id: string) => room.sitOutCounts.get(id) ?? 0;
    const sitOutId = playerIds.reduce((best, id) =>
      count(id) < count(best) ? id : best,
    );
    playerIds.splice(playerIds.indexOf(sitOutId), 1);
    room.sitOutCounts.set(sitOutId, count(sitOutId) + 1);
  }

  const numPairs = Math.floor(playerIds.length / 2);
  room.pairs = [];
  room.drawings = [];
  clearStripFrames(room);

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
    sendPairAssigned(room, pair, pair.playerA);
    sendPairAssigned(room, pair, pair.playerB);
  }
}

function processDrawings(room: Room) {
  room.results = room.pairs.map((pair) => {
    // Who drew it, kept server-side for the gallery (see gallery.ts).
    room.resultAuthors.set(`${room.round}:${pair.id}`, [
      pair.playerA,
      pair.playerB,
    ]);
    const theme = room.themes.find((t) => t.id === pair.themeId);
    const leftDrawing = room.drawings.find(
      (d) => d.pairId === pair.id && d.side === "left",
    );
    const rightDrawing = room.drawings.find(
      (d) => d.pairId === pair.id && d.side === "right",
    );

    return {
      pairId: pair.id,
      themeText: theme?.text ?? "",
      imageLeftDataUrl: leftDrawing?.imageDataUrl ?? "",
      imageRightDataUrl: rightDrawing?.imageDataUrl ?? "",
      round: room.round,
      playerNames: [
        room.players.get(pair.playerA)?.nickname ?? "?",
        room.players.get(pair.playerB)?.nickname ?? "?",
      ] as [string, string],
      playerAvatars: [
        room.players.get(pair.playerA)?.avatarUrl ?? null,
        room.players.get(pair.playerB)?.avatarUrl ?? null,
      ] as [string | null, string | null],
      votes: {},
      stripFrames: keptFrames(room, pair.id) as DrawingResult["stripFrames"],
    };
  });
  // The results hold them now; the turn is over, so nothing reads the map again.
  clearStripFrames(room);

  broadcast(room, {
    type: "drawings-ready",
    drawings: serializeResults(room.results),
  });
  transitionTo(room, "drawing-voting");
}

function processDrawingVotes(room: Room) {
  for (const result of room.results) {
    let first = 0,
      second = 0,
      third = 0;
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

  room.allResults.push(...room.results);

  broadcast(room, {
    type: "reveal-data",
    drawings: serializeResults(room.results),
    players: publicPlayers(room),
  });

  transitionTo(room, "reveal");
}

function endPartyGame(room: Room) {
  broadcast(room, {
    type: "final-results",
    players: publicPlayers(room).sort((a, b) => b.score - a.score),
    drawings: serializeResults(room.allResults),
  });
  transitionTo(room, "final-results");
}

/** The final screens: a game is over and the room may play again. */
export const FINAL_PHASES: Phase[] = [
  "final-results",
  "split-final",
  "face-final",
  "seam-final",
];

/**
 * "Jogar de novo": the same players, mode and options, back in the lobby with
 * the scores at zero and nothing of the last game left behind.
 */
export function resetForNewGame(room: Room) {
  if (room.phaseTimer) clearTimeout(room.phaseTimer);
  room.phaseTimer = null;
  room.game++;
  room.round = 0;
  room.themes = [];
  room.pairs = [];
  room.drawings = [];
  room.results = [];
  room.allResults = [];
  room.sitOutCounts = new Map();
  room.splitDrawings = [];
  room.faceDrawings = [];
  room.seamGroups = [];
  room.seamDrawings = [];
  clearStripFrames(room);
  room.resultAuthors = new Map();
  room.savedDrawings = new Set();
  room.savingDrawings = new Set();
  for (const p of room.players.values()) p.score = 0;
  transitionTo(room, "lobby");
}

const IDLE_PHASES: Phase[] = [
  "lobby",
  "final-results",
  "split-final",
  "face-final",
  "seam-final",
];

/**
 * Called after a player has been removed from the room. A running game that
 * can no longer continue is wrapped up with whatever was finished so far.
 */
export function handlePlayerLeft(room: Room) {
  if (IDLE_PHASES.includes(room.phase)) return;

  if (room.gameMode === "split-body") {
    broadcast(room, {
      type: "notice",
      message: "Seu parceiro saiu. O jogo foi encerrado.",
    });
    room.splitDrawings = room.splitDrawings.filter(
      (d) =>
        d.round !== room.round || (d.topImageDataUrl && d.bottomImageDataUrl),
    );
    startSplitFinal(room);
  } else if (room.gameMode === "face-builder") {
    broadcast(room, {
      type: "notice",
      message: "Seu parceiro saiu. O jogo foi encerrado.",
    });
    room.faceDrawings = room.faceDrawings.filter(
      (d) =>
        d.round !== room.round ||
        (d.player1ImageDataUrl && d.player2ImageDataUrl),
    );
    startFaceFinal(room);
  } else if (room.gameMode === "seam") {
    seamPlayerLeft(room);
  } else if (room.players.size < MIN_PARTY_PLAYERS) {
    broadcast(room, {
      type: "notice",
      message: `Jogadores insuficientes (mínimo ${MIN_PARTY_PLAYERS}). O jogo foi encerrado.`,
    });
    endPartyGame(room);
  }
}

function nextRoundOrEnd(room: Room) {
  if (room.round >= room.totalRounds) {
    endPartyGame(room);
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
      second: Object.values(r.votes).filter((v) => v.second === r.pairId)
        .length,
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

// --- Emenda (seam) -----------------------------------------------------------

const MIN_SEAM_PLAYERS = 2;

/**
 * Cuts an already shuffled list into groups, keeping the order: pairs, and
 * with an odd count the last group is a trio (so 3 players are one trio).
 * Never a group of one, unless there is only one id to begin with.
 */
export function groupPlayers(ids: string[]): string[][] {
  if (ids.length <= 3) return ids.length ? [[...ids]] : [];
  const groups: string[][] = [];
  for (let i = 0; i + 1 < ids.length; i += 2) groups.push(ids.slice(i, i + 2));
  if (ids.length % 2 === 1) groups[groups.length - 1].push(ids[ids.length - 1]);
  return groups;
}

export function startSeamGame(room: Room) {
  if (room.players.size < MIN_SEAM_PLAYERS) return;
  room.round = 1;
  room.seamGroups = [];
  room.seamDrawings = [];
  startSeamRound(room);
}

/** Regroups everyone and opens a drawing turn. */
function startSeamRound(room: Room) {
  clearStripFrames(room);
  const ids = shuffleArray(Array.from(room.players.keys()));
  room.seamGroups = groupPlayers(ids).map((members) => ({
    id: crypto.randomUUID(),
    members,
  }));

  for (const group of room.seamGroups) {
    room.seamDrawings.push({
      groupId: group.id,
      round: room.round,
      memberIds: [...group.members],
      memberNames: group.members.map(
        (id) => room.roster.get(id)?.nickname ?? "?",
      ),
      memberAvatars: group.members.map(
        (id) => room.players.get(id)?.avatarUrl ?? null,
      ),
      layers: group.members.map(() => null),
      stripFrames: [],
    });
  }

  for (const group of room.seamGroups)
    for (const id of group.members) sendSeamRoundStart(room, group, id);

  transitionTo(room, "seam-drawing");
}

function seamDrawingOf(
  room: Room,
  groupId: string,
  round = room.round,
): SeamDrawing | undefined {
  return room.seamDrawings.find(
    (d) => d.groupId === groupId && d.round === round,
  );
}

function sendSeamRoundStart(room: Room, group: SeamGroup, playerId: string) {
  const drawing = seamDrawingOf(room, group.id);
  const index = group.members.indexOf(playerId);
  sendTo(room, playerId, {
    type: "seam-round-start",
    round: room.round,
    totalRounds: room.totalRounds,
    groupId: group.id,
    members: group.members.map((id) => ({
      id,
      nickname: room.roster.get(id)?.nickname ?? "?",
    })),
    index,
    submitted: !!drawing?.layers[index],
    // The other members whose layer is already in.
    partnerSubmitted: group.members.filter(
      (id, i) => i !== index && drawing?.layers[i],
    ),
    // Kept strip frames, neighbours' and own; none at the start of a round.
    frames: framesFor(room, group.id, group.members, playerId),
  });
}

function resyncSeamPlayer(room: Room, playerId: string) {
  if (room.phase === "seam-drawing") {
    const group = room.seamGroups.find((g) => g.members.includes(playerId));
    if (group) sendSeamRoundStart(room, group, playerId);
    if (room.collecting)
      sendTo(room, playerId, { type: "time-up", round: room.round });
  } else if (room.phase === "seam-reveal") {
    sendTo(room, playerId, seamRoundResults(room));
  } else if (room.phase === "seam-final") {
    sendTo(room, playerId, {
      type: "seam-final-results",
      drawings: room.seamDrawings,
    });
  }
}

export function handleSeamDrawingSubmit(
  room: Room,
  playerId: string,
  imageDataUrl: string,
  round?: number,
) {
  if (room.phase !== "seam-drawing") return;
  if (!isCurrentRound(room, round)) {
    console.log(
      `[seam] submit rejected: round ${round}, playing ${room.round}`,
    );
    return;
  }
  const group = room.seamGroups.find((g) => g.members.includes(playerId));
  const drawing = group && seamDrawingOf(room, group.id);
  if (!group || !drawing) return;

  const index = group.members.indexOf(playerId);
  if (drawing.layers[index]) return;
  drawing.layers[index] = imageDataUrl;

  announceReceived(room, playerId, group.members);
  finishSeamRoundIfComplete(room);
}

/** Closes the turn early once every member still in the room has sent their layer. */
function finishSeamRoundIfComplete(room: Room) {
  if (room.phase !== "seam-drawing") return;
  const complete = room.seamDrawings
    .filter((d) => d.round === room.round)
    .every((d) =>
      d.memberIds.every((id, i) => d.layers[i] || !room.players.has(id)),
    );
  if (complete) endSeamRound(room);
}

function seamRoundResults(room: Room) {
  return {
    type: "seam-round-results",
    round: room.round,
    drawings: room.seamDrawings.filter((d) => d.round === room.round),
  };
}

function endSeamRound(room: Room) {
  if (room.phaseTimer) clearTimeout(room.phaseTimer);
  room.phaseTimer = null;
  // The picture keeps each member's latest strips, even of one who left.
  for (const d of room.seamDrawings)
    if (d.round === room.round) d.stripFrames = keptFrames(room, d.groupId);
  // The results hold them now; resync in seam-reveal sends the results.
  clearStripFrames(room);
  broadcast(room, seamRoundResults(room));
  transitionTo(room, "seam-reveal");
}

function nextSeamRoundOrEnd(room: Room) {
  if (room.round >= room.totalRounds) {
    startSeamFinal(room);
  } else {
    room.round++;
    startSeamRound(room);
  }
}

function startSeamFinal(room: Room) {
  room.seamGroups = [];
  broadcast(room, {
    type: "seam-final-results",
    drawings: room.seamDrawings,
  });
  transitionTo(room, "seam-final");
}

/**
 * A player is gone for good. With fewer than 2 left the game ends on the
 * finished rounds; otherwise their layer stays blank and the round goes on.
 */
function seamPlayerLeft(room: Room) {
  if (room.players.size < MIN_SEAM_PLAYERS) {
    broadcast(room, {
      type: "notice",
      message: "Os outros jogadores saíram. O jogo foi encerrado.",
    });
    // The round being drawn never finished; one in its reveal did.
    if (room.phase === "seam-drawing")
      room.seamDrawings = room.seamDrawings.filter(
        (d) => d.round !== room.round,
      );
    startSeamFinal(room);
    return;
  }
  finishSeamRoundIfComplete(room);
}
