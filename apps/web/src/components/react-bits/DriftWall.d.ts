import type { CSSProperties, JSX } from "react";

/** Types for the vendored DriftWall.jsx (React Bits). */
export interface DriftWallItem {
  image: string;
  title?: string;
  href?: string;
}

export interface DriftWallProps {
  items?: DriftWallItem[];
  columns?: number;
  tileWidth?: number;
  tileHeight?: number;
  gap?: number;
  radius?: number;
  tilt?: number;
  turn?: number;
  roll?: number;
  perspective?: number;
  depth?: number;
  speed?: number;
  direction?: "up" | "down";
  variance?: number;
  parallax?: number;
  pauseOnHover?: boolean;
  lift?: number;
  fade?: number;
  dim?: number;
  grayscale?: boolean;
  overlayColor?: string;
  /** Scenery: hidden from screen readers, no focusable tiles. */
  decorative?: boolean;
  className?: string;
  style?: CSSProperties;
}

declare function DriftWall(props: DriftWallProps): JSX.Element;
export default DriftWall;
