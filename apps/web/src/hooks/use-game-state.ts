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
} from "@/types/game";

interface PairAssignment {
  pairId: string;
  partnerId: string;
  side: "left" | "right";
  theme: string;
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
  error: null,
  notice: null,
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
            // A new party round starts: forget last round's pair so a player
            // who sits this one out doesn't keep the stale assignment.
            pairAssignment:
              data.phase === "theme-creation" ? null : s.pairAssignment,
            roomState: s.roomState
              ? {
                  ...s.roomState,
                  phase: data.phase,
                  phaseEndsAt: data.phaseEndsAt,
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
            splitRound: data.round,
            splitSide: data.side,
            silhouetteId: data.silhouetteId,
            roundSubmitted: !!data.submitted,
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
            faceRound: data.round,
            faceRegions: data.regions,
            faceTemplate: data.faceTemplate,
            faceSkinTone: data.skinTone,
            roundSubmitted: !!data.submitted,
            error: null,
          }));
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

  const submitTheme = useCallback((text: string) => {
    send({ type: "submit-theme", text });
  }, []);

  const voteTheme = useCallback((themeId: string) => {
    send({ type: "vote-theme", themeId });
  }, []);

  const submitDrawing = useCallback((imageDataUrl: string) => {
    send({ type: "submit-drawing", imageDataUrl });
  }, []);

  const voteDrawing = useCallback((pairId: string, rank: 1 | 2 | 3) => {
    send({ type: "vote-drawing", pairId, rank });
  }, []);

  const submitSplitDrawing = useCallback((imageDataUrl: string) => {
    send({ type: "submit-split-drawing", imageDataUrl });
  }, []);

  const submitFaceDrawing = useCallback((imageDataUrl: string) => {
    send({ type: "submit-face-drawing", imageDataUrl });
  }, []);

  return {
    ...state,
    createRoom,
    joinRoom,
    rejoinRoom,
    saveDrawing,
    startGame,
    submitTheme,
    voteTheme,
    submitDrawing,
    voteDrawing,
    submitSplitDrawing,
    submitFaceDrawing,
  };
}
