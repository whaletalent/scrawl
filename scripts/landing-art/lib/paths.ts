/**
 * Pure geometry for hand-drawn looking strokes, in the game's 800×600 logical
 * canvas space. Nothing here touches a page: these only build lists of points
 * that `Pen` later traces with the mouse.
 */
export type Pt = { x: number; y: number };

/** Small seeded generator so a run can be repeated stroke for stroke. */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** `[x1, y1, x2, y2, …]` → points. */
export function pts(...n: number[]): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i + 1 < n.length; i += 2) out.push({ x: n[i], y: n[i + 1] });
  return out;
}

const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);

/** A smooth curve through every point (Catmull-Rom). */
export function smooth(through: Pt[]): Pt[] {
  if (through.length < 3) return through;
  const p = [through[0], ...through, through[through.length - 1]];
  const out: Pt[] = [];
  for (let i = 1; i < p.length - 2; i++) {
    const [p0, p1, p2, p3] = [p[i - 1], p[i], p[i + 1], p[i + 2]];
    const steps = Math.max(4, Math.ceil(dist(p1, p2) / 6));
    for (let s = 0; s < steps; s++) {
      const t = s / steps;
      const t2 = t * t;
      const t3 = t2 * t;
      out.push({
        x:
          0.5 *
          (2 * p1.x +
            (-p0.x + p2.x) * t +
            (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
            (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
        y:
          0.5 *
          (2 * p1.y +
            (-p0.y + p2.y) * t +
            (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
            (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
      });
    }
  }
  out.push(through[through.length - 1]);
  return out;
}

/**
 * An oval the way a hand closes one: it starts somewhere on the rim, goes
 * round, and overshoots the starting point a little.
 */
export function oval(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  { start = -1.9, overshoot = 0.35 } = {},
): Pt[] {
  const out: Pt[] = [];
  const total = Math.PI * 2 + overshoot;
  const steps = Math.max(14, Math.ceil(((rx + ry) * Math.PI) / 5));
  for (let i = 0; i <= steps; i++) {
    const a = start + (total * i) / steps;
    out.push({ x: cx + Math.cos(a) * rx, y: cy + Math.sin(a) * ry });
  }
  return out;
}

/** A back-and-forth scribble that colours in a box, row by row. */
export function zigzag(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  gap = 14,
): Pt[] {
  const out: Pt[] = [];
  let left = true;
  for (let y = y0; y <= y1; y += gap) {
    out.push({ x: left ? x0 : x1, y }, { x: left ? x1 : x0, y: y + gap / 2 });
    left = !left;
  }
  return out;
}

/** Same polyline with points no further apart than `step`. */
export function resample(path: Pt[], step: number): Pt[] {
  if (path.length < 2) return path;
  const out: Pt[] = [path[0]];
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1];
    const b = path[i];
    const n = Math.max(1, Math.ceil(dist(a, b) / step));
    for (let s = 1; s <= n; s++)
      out.push({
        x: a.x + ((b.x - a.x) * s) / n,
        y: a.y + ((b.y - a.y) * s) / n,
      });
  }
  return out;
}

/**
 * Makes a clean path look drawn with a mouse: a slow drift off the intended
 * line, a little tremor on top, and points that are unevenly spaced (a hand
 * speeds up and slows down, and the game joins points with straight segments).
 */
export function humanize(path: Pt[], shake: number, rand: () => number): Pt[] {
  const dense = resample(path, 3);
  const f1 = 0.05 + rand() * 0.04;
  const f2 = 0.13 + rand() * 0.07;
  const ph = [rand() * 7, rand() * 7, rand() * 7, rand() * 7];
  const drift = { x: (rand() - 0.5) * shake * 1.6, y: (rand() - 0.5) * shake };
  const out: Pt[] = [];
  let travelled = 0;
  let skip = 0;
  for (let i = 0; i < dense.length; i++) {
    if (i > 0) travelled += dist(dense[i - 1], dense[i]);
    const last = i === dense.length - 1;
    // Uneven speed: drop one or two points now and then.
    if (skip > 0 && !last && i > 0) {
      skip--;
      continue;
    }
    skip = rand() < 0.35 ? 1 + Math.floor(rand() * 2) : 0;
    const wx =
      Math.sin(travelled * f1 + ph[0]) + 0.5 * Math.sin(travelled * f2 + ph[1]);
    const wy =
      Math.sin(travelled * f1 + ph[2]) + 0.5 * Math.sin(travelled * f2 + ph[3]);
    out.push({
      x: dense[i].x + drift.x + wx * shake + (rand() - 0.5) * 0.9,
      y: dense[i].y + drift.y + wy * shake + (rand() - 0.5) * 0.9,
    });
  }
  return out;
}

/**
 * Cuts a path into the runs that lie inside `inside`, ending each run on the
 * border itself. The game ignores pointer positions outside a player's area
 * but keeps the stroke alive, so without this a path that leaves and comes
 * back would be joined by a straight chord.
 */
export function runsInside(
  path: Pt[],
  inside: (x: number, y: number) => boolean,
): Pt[][] {
  const edge = (a: Pt, b: Pt): Pt => {
    // `a` is inside, `b` is not.
    let lo = a;
    let hi = b;
    for (let i = 0; i < 10; i++) {
      const mid = { x: (lo.x + hi.x) / 2, y: (lo.y + hi.y) / 2 };
      if (inside(mid.x, mid.y)) lo = mid;
      else hi = mid;
    }
    return lo;
  };
  const runs: Pt[][] = [];
  let run: Pt[] = [];
  for (let i = 0; i < path.length; i++) {
    const p = path[i];
    const prev = path[i - 1];
    const isIn = inside(p.x, p.y);
    if (isIn) {
      if (run.length === 0 && prev && !inside(prev.x, prev.y))
        run.push(edge(p, prev));
      run.push(p);
    } else if (run.length > 0) {
      run.push(edge(prev, p));
      runs.push(run);
      run = [];
    }
  }
  if (run.length > 0) runs.push(run);
  return runs;
}
