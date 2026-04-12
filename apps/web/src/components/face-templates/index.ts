import type { FaceTemplateId } from "@/types/game";
import { MasculineTemplate } from "./masculine";
import { FeminineTemplate } from "./feminine";
import { MonsterTemplate } from "./monster";
import { AlienFaceTemplate } from "./alien-face";
import { RobotFaceTemplate } from "./robot-face";

const FACE_TEMPLATES: Record<FaceTemplateId, React.FC<{ className?: string }>> = {
  masculine: MasculineTemplate,
  feminine: FeminineTemplate,
  monster: MonsterTemplate,
  "alien-face": AlienFaceTemplate,
  "robot-face": RobotFaceTemplate,
};

export const FACE_TEMPLATE_LABELS: Record<FaceTemplateId, string> = {
  masculine: "Masculino",
  feminine: "Feminino",
  monster: "Monstro",
  "alien-face": "Alien",
  "robot-face": "Robô",
};

export function getFaceTemplate(id: FaceTemplateId) {
  return FACE_TEMPLATES[id];
}
