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
  | "split-final"
  | "face-drawing"
  | "face-final";

export type GameMode = "party" | "split-body" | "face-builder";

export const SILHOUETTE_IDS = [
  "man",
  "woman",
  "child",
  "robot",
  "alien",
  "superhero",
] as const;
export type SilhouetteId = (typeof SILHOUETTE_IDS)[number];

export interface Player {
  id: string;
  nickname: string;
  score: number;
  isHost: boolean;
  ws: WebSocket;
  /** Secret handed to this player only; lets them reclaim their slot after a dropped socket. */
  token: string;
  connected: boolean;
  /** Armed while disconnected; the player is removed for good when it fires. */
  graceTimer: ReturnType<typeof setTimeout> | null;
  /** Account behind this player, or null for a guest. Never sent to clients. */
  userId: string | null;
  avatarUrl: string | null;
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
  round: number;
  playerNames: [string, string];
  /** Avatars of the two authors, in `playerNames` order; null for guests. */
  playerAvatars: [string | null, string | null];
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

export const FACE_TEMPLATE_IDS = [
  "masculine",
  "feminine",
  "monster",
  "alien-face",
  "robot-face",
] as const;
export type FaceTemplateId = (typeof FACE_TEMPLATE_IDS)[number];
export type FaceTemplateOption = FaceTemplateId | "random";

export const FACE_REGION_IDS = [
  "hair",
  "ears",
  "eyes",
  "nose",
  "mouth",
  "shoulders",
] as const;
export type FaceRegionId = (typeof FACE_REGION_IDS)[number];

export interface FaceDrawing {
  round: number;
  faceTemplate: FaceTemplateId;
  skinTone: string;
  assignments: { regionId: FaceRegionId; playerId: string }[];
  player1Id: string;
  player2Id: string;
  player1ImageDataUrl: string | null;
  player2ImageDataUrl: string | null;
}

export interface Room {
  code: string;
  phase: Phase;
  round: number;
  totalRounds: number;
  gameMode: GameMode;
  turnDuration: number;
  splitDrawings: SplitDrawing[];
  faceTemplate: FaceTemplateOption;
  skinTone: string;
  faceDrawings: FaceDrawing[];
  players: Map<string, Player>;
  themes: Theme[];
  pairs: Pair[];
  drawings: DrawingSubmission[];
  results: DrawingResult[];
  /** Party mode: results of every finished round, sent with final-results. */
  allResults: DrawingResult[];
  /** Party mode: how many rounds each player sat out (odd player counts). */
  sitOutCounts: Map<string, number>;
  phaseTimer: ReturnType<typeof setTimeout> | null;
  phaseEndsAt: number;
}

export type ClientMessage =
  | {
      type: "join-room";
      roomCode: string;
      nickname: string;
      /** Supabase access token of a logged-in player. */
      accessToken?: string;
    }
  | { type: "rejoin"; roomCode: string; token: string }
  | {
      type: "create-room";
      nickname: string;
      gameMode?: GameMode;
      totalRounds?: number;
      turnDuration?: number;
      faceTemplate?: FaceTemplateOption;
      skinTone?: string;
      accessToken?: string;
    }
  | { type: "submit-split-drawing"; imageDataUrl: string }
  | { type: "submit-face-drawing"; imageDataUrl: string }
  | { type: "start-game" }
  | { type: "submit-theme"; text: string }
  | { type: "vote-theme"; themeId: string }
  | { type: "submit-drawing"; imageDataUrl: string }
  | { type: "vote-drawing"; pairId: string; rank: 1 | 2 | 3 };
