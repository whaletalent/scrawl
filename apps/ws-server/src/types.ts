import type { WebSocket } from "ws";

export type Phase =
  | "lobby"
  | "theme-creation"
  | "theme-voting"
  | "drawing"
  | "drawing-voting"
  | "reveal"
  | "scoreboard"
  | "final-results";

export interface Player {
  id: string;
  nickname: string;
  score: number;
  isHost: boolean;
  ws: WebSocket;
}

export interface Theme {
  id: string;
  text: string;
  authorId: string;
  votes: string[];
}

export interface Pair {
  id: string;
  playerA: string;
  playerB: string;
  themeId: string;
}

export interface DrawingSubmission {
  pairId: string;
  playerId: string;
  side: "left" | "right";
  imageDataUrl: string;
}

export interface DrawingResult {
  pairId: string;
  themeText: string;
  imageLeftDataUrl: string;
  imageRightDataUrl: string;
  combinedImageDataUrl: string;
  votes: Record<string, { first: string; second: string; third: string }>;
}

export interface Room {
  code: string;
  phase: Phase;
  round: number;
  totalRounds: number;
  players: Map<string, Player>;
  themes: Theme[];
  pairs: Pair[];
  drawings: DrawingSubmission[];
  results: DrawingResult[];
  phaseTimer: ReturnType<typeof setTimeout> | null;
  phaseEndsAt: number;
}

export type ClientMessage =
  | { type: "join-room"; roomCode: string; nickname: string }
  | { type: "create-room"; nickname: string }
  | { type: "start-game" }
  | { type: "submit-theme"; text: string }
  | { type: "vote-theme"; themeId: string }
  | { type: "submit-drawing"; imageDataUrl: string }
  | { type: "vote-drawing"; pairId: string; rank: 1 | 2 | 3 };
