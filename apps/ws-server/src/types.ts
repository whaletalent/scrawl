import type { WebSocket } from "ws";

export type Phase =
  | "lobby"
  | "theme-creation"
  | "theme-voting"
  | "drawing"
  | "drawing-voting"
  | "reveal"
  | "scoreboard"
  | "final-results"
  | "split-drawing"
  | "split-final";

export type GameMode = "party" | "split-body";

export const SILHOUETTE_IDS = ["man", "woman", "child", "robot", "alien", "superhero"] as const;
export type SilhouetteId = (typeof SILHOUETTE_IDS)[number];

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

export interface SplitDrawing {
  round: number;
  topPlayerId: string;
  bottomPlayerId: string;
  topImageDataUrl: string | null;
  bottomImageDataUrl: string | null;
  silhouetteId: SilhouetteId;
}

export interface Room {
  code: string;
  phase: Phase;
  round: number;
  totalRounds: number;
  gameMode: GameMode;
  splitDrawings: SplitDrawing[];
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
  | { type: "create-room"; nickname: string; gameMode?: GameMode; totalRounds?: number }
  | { type: "submit-split-drawing"; imageDataUrl: string }
  | { type: "start-game" }
  | { type: "submit-theme"; text: string }
  | { type: "vote-theme"; themeId: string }
  | { type: "submit-drawing"; imageDataUrl: string }
  | { type: "vote-drawing"; pairId: string; rank: 1 | 2 | 3 };
