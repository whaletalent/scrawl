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
  | "face-final"
  | "seam-drawing"
  | "seam-reveal"
  | "seam-final";

export type GameMode = "party" | "split-body" | "face-builder" | "seam";

export type SilhouetteId =
  "man" | "woman" | "child" | "robot" | "alien" | "superhero";

export interface Player {
  id: string;
  nickname: string;
  score: number;
  isHost: boolean;
  /** False while the player's socket is down and the server is holding their slot. */
  connected?: boolean;
  /** Only players who joined with an account have one. */
  avatarUrl?: string;
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
  round: number;
  playerNames: [string, string];
  /** Avatars of the two authors, in `playerNames` order; null for guests. */
  playerAvatars?: [string | null, string | null];
  votes: { first: number; second: number; third: number };
  /** Latest live frame of the shared strip, per author (Racha-tema). */
  stripFrames: { strip: 0; member: 0 | 1; imageDataUrl: string }[];
}

/** A kept live frame of a strip, as the server relays it. */
export interface StripFrameOut {
  strip: number;
  playerId: string;
  imageDataUrl: string;
}

/** Emenda: one group's picture of one round. Every array is in member order. */
export interface SeamDrawing {
  groupId: string;
  round: number;
  memberIds: string[];
  memberNames: string[];
  /** Null for guests. */
  memberAvatars: (string | null)[];
  /** Each member's transparent 800x600 layer; null until it arrives. */
  layers: (string | null)[];
  stripFrames: { strip: number; member: number; imageDataUrl: string }[];
}

export type SeamRoundStart = {
  type: "seam-round-start";
  round: number;
  totalRounds: number;
  groupId: string;
  members: { id: string; nickname: string }[];
  /** This player's position in `members`, left to right. */
  index: number;
  submitted: boolean;
  /** Ids of the other members whose layer is already in. */
  partnerSubmitted: string[];
  frames: StripFrameOut[];
};

export type SeamRoundResults = {
  type: "seam-round-results";
  round: number;
  drawings: SeamDrawing[];
};

export type SeamFinalResults = {
  type: "seam-final-results";
  drawings: SeamDrawing[];
};

export interface SplitDrawing {
  round: number;
  topPlayerId: string;
  bottomPlayerId: string;
  topImageDataUrl: string | null;
  bottomImageDataUrl: string | null;
  silhouetteId: SilhouetteId;
}

export type FaceTemplateId =
  "masculine" | "feminine" | "monster" | "alien-face" | "robot-face";
export type FaceTemplateOption = FaceTemplateId | "random";
export type FaceRegionId =
  "hair" | "ears" | "eyes" | "nose" | "mouth" | "shoulders";

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
  faceTemplate: FaceTemplateOption;
  skinTone: string;
  /** Listed on the home page for strangers to join. */
  isPublic?: boolean;
  /** Keys of this room's drawings that are already in the gallery. */
  savedDrawings?: string[];
}

/** Points at one finished drawing of a room. `pairId` in party mode only. */
export interface DrawingRef {
  round: number;
  pairId?: string;
}

/** One row of the home page's list of open rooms. */
export interface PublicRoom {
  code: string;
  hostName: string;
  /** Absent when the host is a guest. */
  hostAvatarUrl?: string;
  gameMode: GameMode;
  playerCount: number;
  capacity: number;
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
      /** Defaults to private. "public" is honoured only for a logged-in host. */
      visibility?: "public" | "private";
    }
  | { type: "save-drawing"; drawing: DrawingRef; imageDataUrl: string }
  | { type: "watch-rooms" }
  | { type: "unwatch-rooms" }
  | { type: "start-game" }
  | { type: "play-again" }
  | { type: "submit-theme"; text: string }
  | { type: "vote-theme"; themeId: string }
  | { type: "submit-drawing"; imageDataUrl: string; round: number }
  | { type: "vote-drawing"; pairId: string; rank: 1 | 2 | 3 }
  | { type: "submit-split-drawing"; imageDataUrl: string; round: number }
  | { type: "submit-face-drawing"; imageDataUrl: string; round: number }
  | { type: "submit-seam-drawing"; imageDataUrl: string; round: number }
  | { type: "strip-frame"; round: number; strip: number; imageDataUrl: string };

export type ServerMessage =
  | {
      type: "room-state";
      state: RoomState;
      playerId: string;
      sessionToken?: string;
    }
  | { type: "public-rooms"; rooms: PublicRoom[] }
  | { type: "drawing-saved"; key: string }
  | {
      type: "drawing-save-failed";
      key: string;
      reason: "limit" | "failed" | "not-allowed";
    }
  | { type: "rejoin-failed" }
  | { type: "session-replaced" }
  | { type: "player-connection"; playerId: string; connected: boolean }
  | {
      type: "pair-assigned";
      pairId: string;
      partnerId: string;
      side: "left" | "right";
      theme: string;
      submitted: boolean;
      /** Whether the partner's drawing for this round is already in. */
      partnerSubmitted?: boolean;
      /** Kept strip frames, partner's and own. */
      frames?: StripFrameOut[];
    }
  | { type: "error"; message: string }
  | { type: "phase-change"; phase: Phase; phaseEndsAt: number; round: number }
  | { type: "player-joined"; player: Player }
  | { type: "player-left"; playerId: string; hostId?: string }
  | { type: "notice"; message: string }
  | { type: "theme-submitted"; theme: Theme }
  | { type: "theme-votes-update"; themes: Theme[] }
  /** One of the two drawings of this player's picture reached the server. */
  | { type: "drawing-received"; round: number; playerId: string }
  | { type: "drawings-ready"; drawings: DrawingResult[] }
  | { type: "vote-update"; drawings: DrawingResult[] }
  | { type: "reveal-data"; drawings: DrawingResult[]; players: Player[] }
  | { type: "final-results"; players: Player[]; drawings: DrawingResult[] }
  | {
      type: "split-round-start";
      round: number;
      side: "top" | "bottom";
      silhouetteId: SilhouetteId;
      totalRounds: number;
      submitted: boolean;
      /** Whether the partner's drawing for this round is already in. */
      partnerSubmitted?: boolean;
    }
  | { type: "split-round-end"; round: number }
  | { type: "split-final-results"; drawings: SplitDrawing[] }
  | {
      type: "face-round-start";
      round: number;
      regions: FaceRegionId[];
      faceTemplate: FaceTemplateId;
      skinTone: string;
      totalRounds: number;
      submitted: boolean;
      /** Whether the partner's drawing for this round is already in. */
      partnerSubmitted?: boolean;
    }
  | { type: "face-round-end"; round: number }
  /** A drawing turn ran out: send the drawing now, the server waits a moment for it. */
  | { type: "time-up"; round: number }
  | { type: "face-final-results"; drawings: FaceDrawing[] }
  | SeamRoundStart
  | SeamRoundResults
  | SeamFinalResults
  /** The neighbour's latest layer on a strip we share. */
  | {
      type: "strip-frame";
      round: number;
      strip: number;
      playerId: string;
      imageDataUrl: string;
    };
