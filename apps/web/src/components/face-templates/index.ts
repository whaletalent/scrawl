import type { FaceTemplateId, FaceTemplateOption } from "@/types/game";
import { MasculineTemplate } from "./masculine";
import { FeminineTemplate } from "./feminine";
import { MonsterTemplate } from "./monster";
import { AlienFaceTemplate } from "./alien-face";
import { RobotFaceTemplate } from "./robot-face";

const FACE_TEMPLATES: Record<
  FaceTemplateId,
  React.FC<{ className?: string; fillColor?: string }>
> = {
  masculine: MasculineTemplate,
  feminine: FeminineTemplate,
  monster: MonsterTemplate,
  "alien-face": AlienFaceTemplate,
  "robot-face": RobotFaceTemplate,
};

export const FACE_TEMPLATE_LABELS: Record<FaceTemplateOption, string> = {
  random: "Aleatório",
  masculine: "Masculino",
  feminine: "Feminino",
  monster: "Monstro",
  "alien-face": "Alien",
  "robot-face": "Robô",
};

export const SKIN_TONES = [
  { id: "light", color: "#FDDCB5", label: "Claro" },
  { id: "medium-light", color: "#E8B88A", label: "Medio claro" },
  { id: "medium", color: "#C68642", label: "Medio" },
  { id: "medium-dark", color: "#8D5524", label: "Medio escuro" },
  { id: "dark", color: "#5C3317", label: "Escuro" },
  { id: "green", color: "#6B8E23", label: "Verde" },
  { id: "blue", color: "#4682B4", label: "Azul" },
] as const;

export function getFaceTemplate(id: FaceTemplateId) {
  return FACE_TEMPLATES[id];
}
