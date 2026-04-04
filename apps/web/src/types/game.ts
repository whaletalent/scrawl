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

export interface RoomState {
  code: string;
  phase: Phase;
  round: number;
  totalRounds: number;
  players: Player[];
  themes: Theme[];
  pairs: Pair[];
  drawings: DrawingResult[];
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
  | { type: "final-results"; players: Player[]; drawings: DrawingResult[] };
