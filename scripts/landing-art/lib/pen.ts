/**
 * Draws on the game's canvas the only way a player can: by clicking the
 * toolbar and dragging the mouse. Coordinates are the canvas' 800×600 logical
 * space; `Pen` converts them to the page.
 */
import type { Page } from "playwright";
import {
  FACE_REGIONS,
  isPointInRegion,
} from "../../../apps/web/src/lib/face-regions";
import {
  humanize,
  oval,
  pts,
  rng,
  runsInside,
  smooth,
  zigzag,
  type Pt,
} from "./paths";

/** The toolbar's palette, in the order the colour buttons appear. */
export const INK = {
  black: "#000000",
  white: "#ffffff",
  red: "#ef4444",
  orange: "#f97316",
  yellow: "#eab308",
  green: "#22c55e",
  blue: "#3b82f6",
  violet: "#8b5cf6",
  pink: "#ec4899",
  grey: "#6b7280",
  brown: "#92400e",
  teal: "#0891b2",
} as const;
export type Ink = (typeof INK)[keyof typeof INK];
const PALETTE: string[] = Object.values(INK);
const SIZES = [2, 4, 8, 16];

export type Side = "left" | "right" | "top" | "bottom";
export type FaceRegion =
  "hair" | "ears" | "eyes" | "nose" | "mouth" | "shoulders";

const AREAS: Record<Side, { x: number; y: number; w: number; h: number }> = {
  left: { x: 0, y: 0, w: 400, h: 600 },
  right: { x: 400, y: 0, w: 400, h: 600 },
  top: { x: 0, y: 0, w: 800, h: 300 },
  bottom: { x: 0, y: 300, w: 800, h: 300 },
};

export interface PenOptions {
  /** Party / Split Body: the half this player may draw in. */
  side?: Side;
  /** Face Builder: strokes are limited to the region chosen with `region()`. */
  face?: boolean;
  seed: number;
  /** How unsteady this player's hand is, in logical pixels (about 1.5–3.5). */
  shake: number;
  /** Called by `mark()`: the moment a half-finished drawing is worth a screenshot. */
  onMark?: () => Promise<void>;
}

export class Pen {
  private color: string = INK.black;
  private size = 4;
  private tool: "brush" | "fill" = "brush";
  private inside: (x: number, y: number) => boolean;
  private readonly rand: () => number;
  /** Fills that flooded more than they should have and were taken back. */
  readonly leaks: string[] = [];

  constructor(
    readonly page: Page,
    private readonly opts: PenOptions,
  ) {
    this.rand = rng(opts.seed);
    const area = opts.side ? AREAS[opts.side] : null;
    this.inside = area
      ? (x, y) =>
          x > area.x + 1 &&
          x < area.x + area.w - 1 &&
          y > area.y + 1 &&
          y < area.y + area.h - 1
      : () => false;
  }

  /** Face Builder: the region the next strokes belong to. */
  region(id: FaceRegion) {
    const def = FACE_REGIONS.find((r) => r.id === id)!;
    this.inside = (x, y) =>
      x > 1 && x < 799 && y > 1 && y < 599 && isPointInRegion(x, y, def);
  }

  /** Picks a colour and a brush size on the toolbar. */
  async ink(color: Ink, size: 2 | 4 | 8 | 16 = this.size as 2 | 4 | 8 | 16) {
    if (color !== this.color || this.tool !== "brush") {
      // A colour button also switches back to the brush.
      await this.page
        .locator('button[style*="background-color"]')
        .nth(PALETTE.indexOf(color))
        .click();
      this.color = color;
      this.tool = "brush";
    }
    if (size !== this.size) {
      await this.page
        .locator("button:has(> div.rounded-full.bg-white)")
        .nth(SIZES.indexOf(size))
        .click();
      this.size = size;
    }
  }

  private async toPage(): Promise<(p: Pt) => [number, number]> {
    const box = (await this.page.locator("canvas").boundingBox())!;
    return (p) => [
      box.x + (p.x / 800) * box.width,
      box.y + (p.y / 600) * box.height,
    ];
  }

  /** Drags the mouse along `path` with the current brush. */
  async stroke(path: Pt[], shake = this.opts.shake) {
    const at = await this.toPage();
    const wobbly = humanize(path, shake, this.rand);
    for (const run of runsInside(wobbly, this.inside)) {
      if (run.length < 2) continue;
      await this.page.mouse.move(...at(run[0]));
      await this.page.mouse.down();
      for (const p of run.slice(1)) await this.page.mouse.move(...at(p));
      await this.page.mouse.up();
    }
  }

  /** A line that bends through every point. */
  s(...n: number[]) {
    return this.stroke(smooth(pts(...n)));
  }

  /** A line with corners at every point. */
  l(...n: number[]) {
    return this.stroke(pts(...n));
  }

  /** A hand-closed oval. */
  o(cx: number, cy: number, rx: number, ry: number) {
    return this.stroke(
      oval(cx, cy, rx, ry, {
        start: -2.4 + this.rand() * 1.2,
        overshoot: 0.25 + this.rand() * 0.3,
      }),
    );
  }

  /** Scribbles a box full, the way one colours in with a crayon. */
  z(x0: number, y0: number, x1: number, y1: number, gap = 14) {
    return this.stroke(zigzag(x0, y0, x1, y1, gap));
  }

  /** A blob: the brush wiggled on the spot. */
  dot(x: number, y: number, r = 3) {
    return this.stroke(
      [...oval(x, y, r, r), ...oval(x, y, r / 2, r / 2), { x, y }],
      0.4,
    );
  }

  /**
   * Bucket fill at a point. A fill that escapes through a gap in an outline
   * would flood the paper, so the painted area is measured afterwards and a
   * runaway fill is taken back (Face Builder: the game's undo; elsewhere:
   * filling the same spot with the colour it had).
   */
  async fill(x: number, y: number, color: Ink, { max = 70_000 } = {}) {
    if (!this.inside(x, y)) return;
    await this.ink(color);
    await this.page.getByTitle("Balde").click();
    this.tool = "fill";

    const canvas = this.page.locator("canvas");
    const before = await canvas.evaluate(
      (c: HTMLCanvasElement, [px, py]) => {
        const ctx = c.getContext("2d")!;
        const all = ctx.getImageData(0, 0, c.width, c.height).data;
        (c as unknown as { snap: Uint8ClampedArray }).snap = all;
        const i = (Math.floor(py) * c.width + Math.floor(px)) * 4;
        return [all[i], all[i + 1], all[i + 2], all[i + 3]];
      },
      [x, y],
    );
    const at = await this.toPage();
    await this.page.mouse.click(...at({ x, y }));
    const painted = await canvas.evaluate((c: HTMLCanvasElement) => {
      const was = (c as unknown as { snap: Uint8ClampedArray }).snap;
      const now = c.getContext("2d")!.getImageData(0, 0, c.width, c.height);
      let n = 0;
      for (let i = 0; i < was.length; i += 4)
        if (
          was[i] !== now.data[i] ||
          was[i + 1] !== now.data[i + 1] ||
          was[i + 2] !== now.data[i + 2] ||
          was[i + 3] !== now.data[i + 3]
        )
          n++;
      return n;
    });
    if (painted <= max) return;

    this.leaks.push(`${color} at ${x},${y} painted ${painted}px`);
    if (this.opts.face) {
      await this.page.getByTitle("Desfazer (Ctrl+Z)").click();
      return;
    }
    const hex =
      "#" +
      before
        .slice(0, 3)
        .map((v) => v.toString(16).padStart(2, "0"))
        .join("");
    if (PALETTE.includes(hex)) {
      await this.ink(hex as Ink);
      await this.page.getByTitle("Balde").click();
      this.tool = "fill";
      await this.page.mouse.click(...at({ x, y }));
    }
  }

  /** One of the toolbar's shape tools, dragged corner to corner. */
  async shape(
    kind: "Linha" | "Retângulo" | "Círculo",
    color: Ink,
    size: 2 | 4 | 8 | 16,
    from: Pt,
    to: Pt,
  ) {
    await this.ink(color, size);
    await this.page.getByTitle(kind).click();
    this.tool = "fill"; // anything but "brush": the next ink() re-selects it
    const at = await this.toPage();
    await this.page.mouse.move(...at(from));
    await this.page.mouse.down();
    await this.page.mouse.move(...at(to), { steps: 12 });
    await this.page.mouse.up();
  }

  /** Half-way point of a drawing. */
  async mark() {
    await this.opts.onMark?.();
  }
}
