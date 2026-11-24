import { drawableRects, seamLayout, type Rect } from "@/lib/seam-geometry";
import type { StackedFrame } from "@/lib/compose-drawing";

const WIDTH = 800;
const HEIGHT = 600;

const place = (r: Rect): React.CSSProperties => ({
  left: `${(r.x / WIDTH) * 100}%`,
  top: `${(r.y / HEIGHT) * 100}%`,
  width: `${(r.width / WIDTH) * 100}%`,
  height: `${(r.height / HEIGHT) * 100}%`,
});

const FULL: Rect = { x: 0, y: 0, width: WIDTH, height: HEIGHT };

/**
 * Hides whatever a member's full-size layer holds outside their own paper
 * (zone and strips), so a modified client can't paint over the others. A
 * member's rects sit side by side at full height, so their union is the
 * box around them.
 */
function clipToMember(size: 2 | 3, member: number): string {
  const rects = drawableRects(size, member);
  const left = Math.min(...rects.map((r) => r.x));
  const right = Math.max(...rects.map((r) => r.x + r.width));
  const top = Math.min(...rects.map((r) => r.y));
  const bottom = Math.max(...rects.map((r) => r.y + r.height));
  const pct = (v: number, of: number) => `${(v / of) * 100}%`;
  return `inset(${pct(top, HEIGHT)} ${pct(WIDTH - right, WIDTH)} ${pct(
    HEIGHT - bottom,
    HEIGHT,
  )} ${pct(left, WIDTH)})`;
}

/**
 * A Racha-tema or Emenda picture as the screens show it, in the same order
 * as `composeLayers`: white paper, then for each member their kept strip
 * frames and their whole transparent layer. Plain images, no canvas.
 */
export function StackedDrawing({
  layers,
  frames,
  size,
  alt,
  className = "",
}: {
  /** Each member's 800×600 layer, left to right; null when it never came. */
  layers: (string | null)[];
  /** Absent from a server older than the live strips. */
  frames?: StackedFrame[];
  size: 2 | 3;
  alt: string;
  className?: string;
}) {
  const { strips } = seamLayout(size);
  const parts: {
    key: string;
    src: string;
    rect: Rect;
    clipPath?: string;
  }[] = layers.flatMap((layer, member) => [
    ...(frames ?? [])
      .filter((f) => f.member === member && strips[f.strip])
      .map((f) => ({
        key: `f${member}:${f.strip}`,
        src: f.imageDataUrl,
        rect: strips[f.strip],
      })),
    ...(layer
      ? [
          {
            key: `l${member}`,
            src: layer,
            rect: FULL,
            clipPath: clipToMember(size, member),
          },
        ]
      : []),
  ]);

  return (
    <div
      role="img"
      aria-label={alt}
      className={`relative aspect-[4/3] bg-white overflow-hidden ${className}`}
    >
      {parts.map(({ key, src, rect, clipPath }) => (
        <img
          key={key}
          src={src}
          alt=""
          draggable={false}
          className="absolute object-fill"
          style={{ ...place(rect), clipPath }}
        />
      ))}
    </div>
  );
}
