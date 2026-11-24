import type { CSSProperties, HTMLAttributes, JSX } from "react";

/** Types for the vendored CircularGallery.jsx (React Bits). */
export interface CircularGalleryItem {
  image: string;
  text?: string;
  description?: string;
  alt?: string;
}

export interface CircularGalleryProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  "style"
> {
  items?: CircularGalleryItem[];
  bend?: number;
  textColor?: string;
  borderRadius?: number;
  font?: string;
  fontUrl?: string;
  scrollSpeed?: number;
  scrollEase?: number;
  itemSize?: number;
  itemAspect?: number;
  gap?: number;
  wave?: number;
  fadeEdges?: number;
  shadow?: number;
  grayscale?: boolean;
  showTitles?: boolean;
  snap?: boolean;
  autoScroll?: number;
  openOnClick?: boolean;
  intro?: boolean;
  onItemClick?: (item: CircularGalleryItem, index: number) => void;
  onActiveChange?: (index: number) => void;
  dpr?: number;
  /** The words said to screen readers. */
  labels?: Partial<{
    region: string;
    close: string;
    of: string;
    opened: string;
    image: string;
  }>;
  className?: string;
  style?: CSSProperties;
}

declare function CircularGallery(props: CircularGalleryProps): JSX.Element;
export default CircularGallery;
