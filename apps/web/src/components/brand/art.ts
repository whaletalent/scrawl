import { BASE_PATH } from "@/lib/routes";

/**
 * The mascots and toys (public/landing/, made by scripts/landing-art/).
 * Plain <img> addresses: a static export has no image optimizer.
 */
export type ArtName =
  | "logo"
  | "mascot-rocket"
  | "mascot-rocket-sm"
  | "mascot-flyer"
  | "mascot-flyer-sm"
  | "mascot-trophy"
  | "mascot-trophy-sm"
  | "mode-party"
  | "mode-split-body"
  | "mode-face-builder";

export function art(name: ArtName): string {
  return `${BASE_PATH}/landing/${name}.webp`;
}
