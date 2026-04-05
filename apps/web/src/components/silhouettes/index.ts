import type { SilhouetteId } from "@/types/game";
import { ManSilhouette } from "./man";
import { WomanSilhouette } from "./woman";
import { ChildSilhouette } from "./child";
import { RobotSilhouette } from "./robot";
import { AlienSilhouette } from "./alien";
import { SuperheroSilhouette } from "./superhero";

const SILHOUETTES: Record<SilhouetteId, React.FC<{ className?: string }>> = {
  man: ManSilhouette,
  woman: WomanSilhouette,
  child: ChildSilhouette,
  robot: RobotSilhouette,
  alien: AlienSilhouette,
  superhero: SuperheroSilhouette,
};

export function getSilhouette(id: SilhouetteId) {
  return SILHOUETTES[id];
}
