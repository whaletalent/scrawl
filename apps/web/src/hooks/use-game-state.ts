"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { connect, disconnect, send, onMessage, onOpen } from "@/lib/ws-client";
import type {
  DrawingRef,
  RoomState,
  Phase,
  Player,
  DrawingResult,
  SplitDrawing,
  SilhouetteId,
  GameMode,
  FaceDrawing,
  FaceRegionId,
  FaceTemplateId,
  FaceTemplateOption,
  SeamRoundStart,
  SeamRoundResults,
  SeamFinalResults,
  StripFrameOut,
} from "@/types/game";

interface PairAssignment {
  pairId: string;
  partnerId: string;
  side: "left" | "right";
  theme: string;
}

/** Frames keyed "strip:playerId". */
function frameMap(frames: StripFrameOut[] | undefined) {
  const map: Record<string, string> = {};
  for (const f of frames ?? [])
    map[`${f.strip}:${f.playerId}`] = f.imageDataUrl;
  return map;
}

const SESSION_KEY = "scrawl-session";

interface Session {
  code: string;
  token: string;
}

/** The slot this tab holds in a room, kept across reloads so it can be reclaimed. */
export function readSession(): Session | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

interface GameState {
  connected: boolean;
  playerId: string | null;
  roomState: RoomState | null;
  pairAssignment: PairAssignment | null;
  /** Whether the server already has this player's drawing for the current round. */
  roundSubmitted: boolean;
  /** The server said the drawing turn is over: the drawing on screen goes now. */
  timeUp: boolean;
  /** The server confirmed it has this round's drawing from me / from my partner. */
  mineReceived: boolean;
  partnerReceived: boolean;
  /** A `rejoin` was refused — the old slot is gone. */
  rejoinFailed: boolean;
  /** This page was playing and lost its slot for good; don't auto-join anything. */
  sessionLost: boolean;
  drawings: DrawingResult[];
  splitRound: number;
  splitSide: "top" | "bottom" | null;
  silhouetteId: SilhouetteId | null;
  splitDrawings: SplitDrawing[];
  faceRegions: FaceRegionId[];
  faceTemplate: FaceTemplateId | null;
  faceSkinTone: string | null;
  faceRound: number;
  faceDrawings: FaceDrawing[];
  /** Emenda: the last `seam-round-start`, the current round's results, the final. */
  seamRound: SeamRoundStart | null;
  seamResults: SeamRoundResults | null;
  seamFinal: SeamFinalResults | null;
  /** Emenda: the other group members whose layer for this round is in. */
  seamReceived: string[];
  /** Live frames of the current round, keyed "strip:playerId". */
  stripFrames: Record<string, string>;
  error: string | null;
  notice: string | null;
  /** Keys of this room's drawings that are in the gallery. */
  savedDrawings: string[];
  /** Why the last attempt to save a drawing failed, by key. */
  saveFailures: Record<string, { reason: "limit" | "failed" | "not-allowed" }>;
}

const initialState: GameState = {
  connected: false,
  playerId: null,
  roomState: null,
  pairAssignment: null,
  savedDrawings: [],
  saveFailures: {},
  roundSubmitted: false,
  timeUp: false,
  mineReceived: false,
  partnerReceived: false,
  rejoinFailed: false,
  sessionLost: false,
  drawings: [],
  splitRound: 0,
  splitSide: null,
  silhouetteId: null,
  splitDrawings: [],
  faceRegions: [],
  faceTemplate: null,
  faceSkinTone: null,
  faceRound: 0,
  faceDrawings: [],
  seamRound: null,
  seamResults: null,
  seamFinal: null,
  seamReceived: [],
  stripFrames: {},
  error: null,
  notice: null,
};

/** Everything that belongs to one game, cleared when the room plays again. */
const PER_GAME: Partial<GameState> = {
  pairAssignment: null,
  roundSubmitted: false,
  timeUp: false,
  mineReceived: false,
  partnerReceived: false,
  drawings: [],
  splitRound: 0,
  splitSide: null,
  silhouetteId: null,
  splitDrawings: [],
  faceRegions: [],
  faceTemplate: null,
  faceSkinTone: null,
  faceRound: 0,
  faceDrawings: [],
  seamRound: null,
  seamResults: null,
  seamFinal: null,
  seamReceived: [],
  stripFrames: {},
  notice: null,
  saveFailures: {},
};

export function useGameState() {
  const [state, setState] = useState<GameState>(initialState);
  // The session this page is actually playing with (set once the server accepts us).
  const sessionRef = useRef<Session | null>(null);

  useEffect(() => {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8080";

    // The socket auto-reconnects after a drop; a fresh socket is anonymous to
    // the server, so reclaim our slot every time it (re)opens mid-session.
    const unsubscribeOpen = onOpen(() => {
      const session = sessionRef.current;
      if (session)
        send({ type: "rejoin", roomCode: session.code, token: session.token });
    });

    connect(wsUrl);
    setState((s) => ({ ...s, connected: true }));

    const unsubscribe = onMessage((data) => {
      switch (data.type) {
        case "room-state":
          if (data.sessionToken) {
            sessionRef.current = {
              code: data.state.code,
              token: data.sessionToken,
            };
            try {
              sessionStorage.setItem(
                SESSION_KEY,
                JSON.stringify(sessionRef.current),
              );
            } catch {
              // storage unavailable: reconnect still works, reload won't
            }
          }
          setState((s) => ({
            ...s,
            // Back in the lobby ("Jogar de novo"): nothing of the last game stays.
            ...(data.state.phase === "lobby" ? PER_GAME : {}),
            roomState: data.state,
            savedDrawings: data.state.savedDrawings ?? [],
            playerId: data.playerId ?? s.playerId,
            error: null,
            rejoinFailed: false,
          }));
          break;

        case "rejoin-failed": {
          const wasPlaying = sessionRef.current !== null;
          sessionRef.current = null;
          try {
            sessionStorage.removeItem(SESSION_KEY);
          } catch {
            // ignore
          }
          setState((s) => ({
            ...s,
            rejoinFailed: true,
            // Dropped mid-session and the grace period ran out: nothing to go back to.
            ...(wasPlaying
              ? {
                  roomState: null,
                  sessionLost: true,
                  error: "Você foi desconectado e sua vaga na sala expirou.",
                }
              : {}),
          }));
          break;
        }

        case "session-replaced":
          // Another tab took over this slot (e.g. a duplicated tab). Stop
          // reconnecting, otherwise the two tabs would steal it back and forth.
          sessionRef.current = null;
          try {
            sessionStorage.removeItem(SESSION_KEY);
          } catch {
            // ignore
          }
          disconnect();
          setState((s) => ({
            ...s,
            roomState: null,
            sessionLost: true,
            error: "Esta sala foi aberta em outra aba.",
          }));
          break;

        case "player-connection":
          setState((s) => ({
            ...s,
            roomState: s.roomState
              ? {
                  ...s.roomState,
                  players: s.roomState.players.map((p: Player) =>
                    p.id === data.playerId
                      ? { ...p, connected: data.connected }
                      : p,
                  ),
                }
              : null,
          }));
          break;

        case "phase-change":
          setState((s) => ({
            ...s,
            timeUp: false,
            // Each drawing turn starts with nothing received.
            mineReceived: false,
            partnerReceived: false,
            // A new party round starts: forget last round's pair so a player
            // who sits this one out doesn't keep the stale assignment.
            pairAssignment:
              data.phase === "theme-creation" ? null : s.pairAssignment,
            roomState: s.roomState
              ? {
                  ...s.roomState,
                  phase: data.phase,
                  phaseEndsAt: data.phaseEndsAt,
                  // The server starts every round's theme list empty.
                  themes:
                    data.phase === "theme-creation" ? [] : s.roomState.themes,
                  round: data.round ?? s.roomState.round,
                }
              : null,
          }));
          break;

        case "player-joined":
          setState((s) => ({
            ...s,
            roomState: s.roomState
              ? {
                  ...s.roomState,
                  players: [...s.roomState.players, data.player],
                }
              : null,
          }));
          break;

        case "player-left":
          setState((s) => ({
            ...s,
            roomState: s.roomState
              ? {
                  ...s.roomState,
                  players: s.roomState.players
                    .filter((p: Player) => p.id !== data.playerId)
                    .map((p: Player) =>
                      data.hostId ? { ...p, isHost: p.id === data.hostId } : p,
                    ),
                }
              : null,
          }));
          break;

        case "theme-submitted":
          setState((s) => ({
            ...s,
            roomState: s.roomState
              ? { ...s.roomState, themes: [...s.roomState.themes, data.theme] }
              : null,
          }));
          break;

        case "theme-votes-update":
          setState((s) => ({
            ...s,
            roomState: s.roomState
              ? { ...s.roomState, themes: data.themes }
              : null,
          }));
          break;

        case "pair-assigned": {
          setState((s) => ({
            ...s,
            pairAssignment: {
              pairId: data.pairId,
              partnerId: data.partnerId,
              side: data.side,
              theme: data.theme,
            },
            roundSubmitted: !!data.submitted,
            mineReceived: !!data.submitted,
            partnerReceived: !!data.partnerSubmitted,
            stripFrames: frameMap(data.frames),
          }));
          break;
        }

        case "drawings-ready":
          setState((s) => ({ ...s, drawings: data.drawings }));
          break;

        case "reveal-data":
          setState((s) => ({
            ...s,
            drawings: data.drawings,
            roomState: s.roomState
              ? { ...s.roomState, players: data.players }
              : null,
          }));
          break;

        case "final-results":
          setState((s) => ({
            ...s,
            drawings: data.drawings,
            roomState: s.roomState
              ? {
                  ...s.roomState,
                  players: data.players,
                  phase: "final-results" as Phase,
                }
              : null,
          }));
          break;

        case "error":
          setState((s) => ({ ...s, error: data.message }));
          break;

        case "drawing-saved":
          setState((s) => ({
            ...s,
            savedDrawings: [...s.savedDrawings, data.key],
          }));
          break;

        case "drawing-save-failed":
          // A new object each time, so a repeated failure is still noticed.
          setState((s) => ({
            ...s,
            saveFailures: {
              ...s.saveFailures,
              [data.key]: { reason: data.reason },
            },
          }));
          break;

        case "notice":
          setState((s) => ({ ...s, notice: data.message }));
          break;

        case "split-round-start":
          setState((s) => ({
            ...s,
            timeUp: false,
            splitRound: data.round,
            splitSide: data.side,
            silhouetteId: data.silhouetteId,
            roundSubmitted: !!data.submitted,
            mineReceived: !!data.submitted,
            partnerReceived: !!data.partnerSubmitted,
            error: null,
          }));
          break;

        case "split-round-end":
          setState((s) => ({
            ...s,
            splitSide: null,
          }));
          break;

        case "split-final-results":
          setState((s) => ({
            ...s,
            splitDrawings: data.drawings,
          }));
          break;

        case "face-round-start":
          setState((s) => ({
            ...s,
            timeUp: false,
            faceRound: data.round,
            faceRegions: data.regions,
            faceTemplate: data.faceTemplate,
            faceSkinTone: data.skinTone,
            roundSubmitted: !!data.submitted,
            mineReceived: !!data.submitted,
            partnerReceived: !!data.partnerSubmitted,
            error: null,
          }));
          break;

        case "drawing-received":
          setState((s) => {
            // A confirmation for a round that's over changes nothing.
            if (s.roomState && data.round !== s.roomState.round) return s;
            return data.playerId === s.playerId
              ? { ...s, mineReceived: true }
              : {
                  ...s,
                  partnerReceived: true,
                  seamReceived: s.seamReceived.includes(data.playerId)
                    ? s.seamReceived
                    : [...s.seamReceived, data.playerId],
                };
          });
          break;

        case "seam-round-start":
          setState((s) => ({
            ...s,
            timeUp: false,
            seamRound: data,
            seamResults: null,
            roundSubmitted: !!data.submitted,
            mineReceived: !!data.submitted,
            partnerReceived: data.partnerSubmitted.length > 0,
            seamReceived: data.partnerSubmitted,
            stripFrames: frameMap(data.frames),
            error: null,
          }));
          break;

        case "seam-round-results":
          setState((s) => ({ ...s, seamResults: data }));
          break;

        case "seam-final-results":
          setState((s) => ({ ...s, seamFinal: data }));
          break;

        case "strip-frame":
          setState((s) => {
            // A frame of a round that's over changes nothing.
            if (!s.roomState || data.round !== s.roomState.round) return s;
            return {
              ...s,
              stripFrames: {
                ...s.stripFrames,
                [`${data.strip}:${data.playerId}`]: data.imageDataUrl,
              },
            };
          });
          break;

        case "time-up":
          setState((s) => ({ ...s, timeUp: true }));
          break;

        case "face-round-end":
          setState((s) => ({
            ...s,
            faceRegions: [],
          }));
          break;

        case "face-final-results":
          setState((s) => ({
            ...s,
            faceDrawings: data.drawings,
          }));
          break;
      }
    });

    return () => {
      unsubscribe();
      unsubscribeOpen();
      disconnect();
    };
  }, []);

  const createRoom = useCallback(
    (
      nickname: string,
      gameMode?: GameMode,
      totalRounds?: number,
      turnDuration?: number,
      faceTemplate?: FaceTemplateOption,
      skinTone?: string,
      accessToken?: string,
      visibility?: "public" | "private",
    ) => {
      send({
        type: "create-room",
        nickname,
        gameMode,
        totalRounds,
        turnDuration,
        faceTemplate,
        skinTone,
        accessToken,
        visibility,
      });
    },
    [],
  );

  const joinRoom = useCallback(
    (roomCode: string, nickname: string, accessToken?: string) => {
      send({ type: "join-room", roomCode, nickname, accessToken });
    },
    [],
  );

  const rejoinRoom = useCallback((session: Session) => {
    send({ type: "rejoin", roomCode: session.code, token: session.token });
  }, []);

  const saveDrawing = useCallback(
    (drawing: DrawingRef, imageDataUrl: string) => {
      send({ type: "save-drawing", drawing, imageDataUrl });
    },
    [],
  );

  const startGame = useCallback(() => {
    send({ type: "start-game" });
  }, []);

  const playAgain = useCallback(() => {
    send({ type: "play-again" });
  }, []);

  const submitTheme = useCallback((text: string) => {
    send({ type: "submit-theme", text });
  }, []);

  const voteTheme = useCallback((themeId: string) => {
    send({ type: "vote-theme", themeId });
  }, []);

  const submitDrawing = useCallback((imageDataUrl: string, round: number) => {
    send({ type: "submit-drawing", imageDataUrl, round });
  }, []);

  const voteDrawing = useCallback((pairId: string, rank: 1 | 2 | 3) => {
    send({ type: "vote-drawing", pairId, rank });
  }, []);

  const submitSplitDrawing = useCallback(
    (imageDataUrl: string, round: number) => {
      send({ type: "submit-split-drawing", imageDataUrl, round });
    },
    [],
  );

  const submitFaceDrawing = useCallback(
    (imageDataUrl: string, round: number) => {
      send({ type: "submit-face-drawing", imageDataUrl, round });
    },
    [],
  );

  const submitSeamDrawing = useCallback(
    (imageDataUrl: string, round: number) => {
      send({ type: "submit-seam-drawing", imageDataUrl, round });
    },
    [],
  );

  const sendStripFrame = useCallback(
    (round: number, strip: number, imageDataUrl: string) => {
      send({ type: "strip-frame", round, strip, imageDataUrl });
    },
    [],
  );

  return {
    ...state,
    createRoom,
    joinRoom,
    rejoinRoom,
    saveDrawing,
    startGame,
    playAgain,
    submitTheme,
    voteTheme,
    submitDrawing,
    voteDrawing,
    submitSplitDrawing,
    submitFaceDrawing,
    submitSeamDrawing,
    sendStripFrame,
  };
}
