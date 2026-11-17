"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { connect, disconnect, send, onMessage } from "@/lib/ws-client";
import type { RoomState, Phase, Player, Theme, DrawingResult, SplitDrawing, SilhouetteId, GameMode, FaceDrawing, FaceRegionId, FaceTemplateId, FaceTemplateOption } from "@/types/game";

interface PairAssignment {
  pairId: string;
  partnerId: string;
  side: "left" | "right";
  theme: string;
}

interface GameState {
  connected: boolean;
  playerId: string | null;
  roomState: RoomState | null;
  pairAssignment: PairAssignment | null;
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
}

const initialState: GameState = {
  connected: false,
  playerId: null,
  roomState: null,
  pairAssignment: null,
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
};

export function useGameState() {
  const [state, setState] = useState<GameState>(initialState);

  useEffect(() => {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8080";
    connect(wsUrl);
    setState((s) => ({ ...s, connected: true }));

    const unsubscribe = onMessage((data: any) => {
      switch (data.type) {
        case "room-state":
          setState((s) => ({
            ...s,
            roomState: data.state,
            playerId: data.playerId ?? s.playerId,
            error: null,
          }));
          break;

        case "phase-change":
          setState((s) => ({
            ...s,
            roomState: s.roomState
              ? { ...s.roomState, phase: data.phase, phaseEndsAt: data.phaseEndsAt }
              : null,
          }));
          break;

        case "player-joined":
          setState((s) => ({
            ...s,
            roomState: s.roomState
              ? { ...s.roomState, players: [...s.roomState.players, data.player] }
              : null,
          }));
          break;

        case "player-left":
          setState((s) => ({
            ...s,
            roomState: s.roomState
              ? {
                  ...s.roomState,
                  players: s.roomState.players.filter((p: Player) => p.id !== data.playerId),
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
              ? { ...s.roomState, players: data.players, phase: "final-results" as Phase }
              : null,
          }));
          break;

        case "error":
          setState((s) => ({ ...s, error: data.message }));
          break;

        case "split-round-start":
          setState((s) => ({
            ...s,
            splitRound: data.round,
            splitSide: data.side,
            silhouetteId: data.silhouetteId,
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
      disconnect();
    };
  }, []);

  const createRoom = useCallback((nickname: string, gameMode?: GameMode, totalRounds?: number, turnDuration?: number, faceTemplate?: FaceTemplateOption, skinTone?: string) => {
    send({ type: "create-room", nickname, gameMode, totalRounds, turnDuration, faceTemplate, skinTone });
  }, []);

  const joinRoom = useCallback((roomCode: string, nickname: string) => {
    send({ type: "join-room", roomCode, nickname });
  }, []);

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
    startGame,
    submitTheme,
    voteTheme,
    submitDrawing,
    voteDrawing,
    submitSplitDrawing,
    submitFaceDrawing,
  };
}
