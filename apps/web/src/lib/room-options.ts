import type { FaceTemplateOption, GameMode } from "@/types/game";

export interface RoomOptions {
  nickname: string;
  gameMode: GameMode;
  totalRounds: number;
  turnDuration: number;
  faceTemplate: FaceTemplateOption;
  skinTone: string;
  visibility: "public" | "private";
}

/**
 * The room page creates the room, so whoever sends the player there (landing
 * or home) leaves the chosen options in sessionStorage for it to pick up.
 */
export function storeRoomOptions(o: RoomOptions) {
  sessionStorage.setItem("scrawl-nickname", o.nickname);
  sessionStorage.setItem("scrawl-gameMode", o.gameMode);
  sessionStorage.setItem("scrawl-totalRounds", String(o.totalRounds));
  sessionStorage.setItem("scrawl-turnDuration", String(o.turnDuration));
  sessionStorage.setItem("scrawl-faceTemplate", o.faceTemplate);
  sessionStorage.setItem("scrawl-skinTone", o.skinTone);
  sessionStorage.setItem("scrawl-visibility", o.visibility);
}

export const CREATE_LABEL: Record<GameMode, string> = {
  party: "Criar Racha-tema",
  "split-body": "Criar Monstrinho",
  "face-builder": "Criar Caricatura a dois",
  seam: "Criar Emenda",
};
