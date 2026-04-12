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

export type SilhouetteId = "man" | "woman" | "child" | "robot" | "alien" | "superhero";

export interface Player {
  id: string;
  nickname: string;
  score: number;
  isHost: boolean;
}

export interface Theme {
  id: string;
  text: string;
  authorId: string;
  votes: number;
}

export interface Pair {
  id: string;
  playerA: string;
  playerB: string;
  themeId: string;
}

export interface DrawingResult {
  pairId: string;
  themeText: string;
  imageLeftDataUrl: string;
  imageRightDataUrl: string;
  combinedImageDataUrl: string;
  votes: { first: number; second: number; third: number };
}

export interface SplitDrawing {
  round: number;
  topPlayerId: string;
  bottomPlayerId: string;
  topImageDataUrl: string | null;
  bottomImageDataUrl: string | null;
  silhouetteId: SilhouetteId;
}

export type FaceTemplateId = "masculine" | "feminine" | "monster" | "alien-face" | "robot-face";
export type FaceRegionId = "hair" | "ears" | "eyes" | "nose" | "mouth" | "shoulders";

export interface FaceDrawing {
  round: number;
  faceTemplate: FaceTemplateId;
  assignments: { regionId: FaceRegionId; playerId: string }[];
  player1Id: string;
  player2Id: string;
  player1ImageDataUrl: string | null;
  player2ImageDataUrl: string | null;
}

export interface RoomState {
  code: string;
  gameMode: GameMode;
  turnDuration: number;
  phase: Phase;
  round: number;
  totalRounds: number;
  players: Player[];
  themes: Theme[];
  pairs: Pair[];
  drawings: DrawingResult[];
  phaseEndsAt: number;
  faceTemplate: FaceTemplateId;
}

export type ClientMessage =
  | { type: "join-room"; roomCode: string; nickname: string }
  | { type: "create-room"; nickname: string; gameMode?: GameMode; totalRounds?: number; turnDuration?: number; faceTemplate?: FaceTemplateId }
  | { type: "start-game" }
  | { type: "submit-theme"; text: string }
  | { type: "vote-theme"; themeId: string }
  | { type: "submit-drawing"; imageDataUrl: string }
  | { type: "vote-drawing"; pairId: string; rank: 1 | 2 | 3 }
  | { type: "submit-split-drawing"; imageDataUrl: string }
  | { type: "submit-face-drawing"; imageDataUrl: string };

export type ServerMessage =
  | { type: "room-state"; state: RoomState }
  | { type: "error"; message: string }
  | { type: "phase-change"; phase: Phase; phaseEndsAt: number }
  | { type: "player-joined"; player: Player }
  | { type: "player-left"; playerId: string }
  | { type: "theme-submitted"; theme: Theme }
  | { type: "theme-votes-update"; themes: Theme[] }
  | { type: "drawing-submitted"; pairId: string; side: "left" | "right" }
  | { type: "drawings-ready"; drawings: DrawingResult[] }
  | { type: "vote-update"; drawings: DrawingResult[] }
  | { type: "reveal-data"; drawings: DrawingResult[]; players: Player[] }
  | { type: "final-results"; players: Player[]; drawings: DrawingResult[] }
  | { type: "split-round-start"; round: number; side: "top" | "bottom"; silhouetteId: SilhouetteId; totalRounds: number }
  | { type: "split-round-end"; round: number }
  | { type: "split-final-results"; drawings: SplitDrawing[] }
  | { type: "face-round-start"; round: number; regions: FaceRegionId[]; faceTemplate: FaceTemplateId; totalRounds: number }
  | { type: "face-round-end"; round: number }
  | { type: "face-final-results"; drawings: FaceDrawing[] };
