import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { fillLayer, floodFill } from "../src/lib/flood-fill";
import { drawableRects, type Rect } from "../src/lib/seam-geometry";

const W = 10;
const H = 6;
const RED: [number, number, number, number] = [255, 0, 0, 255];
const BLUE: [number, number, number, number] = [0, 0, 255, 255];

const blank = () => new Uint8ClampedArray(W * H * 4); // all transparent
const px = (d: Uint8ClampedArray, x: number, y: number) =>
  Array.from(d.slice((y * W + x) * 4, (y * W + x) * 4 + 4));
const setPx = (
  d: Uint8ClampedArray,
  x: number,
  y: number,
  c: [number, number, number, number],
) => d.set(c, (y * W + x) * 4);
const whole: Rect[] = [{ x: 0, y: 0, width: W, height: H }];

test("fills the transparent region and stops at an own-layer line", () => {
  const d = blank();
  for (let y = 0; y < H; y++) setPx(d, 4, y, BLUE); // vertical wall at x=4
  floodFill(d, W, H, 1, 1, RED, whole);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const expected = x < 4 ? RED : x === 4 ? BLUE : [0, 0, 0, 0];
      assert.deepEqual(px(d, x, y), expected, `pixel ${x},${y}`);
    }
  }
});

test("never writes outside the clip rects", () => {
  const d = blank();
  const clip: Rect[] = [
    { x: 0, y: 0, width: 3, height: H },
    { x: 3, y: 0, width: 2, height: 2 },
  ];
  floodFill(d, W, H, 0, 0, RED, clip);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const inside = x < 3 || (x < 5 && y < 2);
      assert.deepEqual(
        px(d, x, y),
        inside ? RED : [0, 0, 0, 0],
        `pixel ${x},${y}`,
      );
    }
  }
});

test("a fill started outside the clip does nothing", () => {
  const d = blank();
  const clip: Rect[] = [{ x: 0, y: 0, width: 3, height: H }];
  floodFill(d, W, H, 7, 2, RED, clip);
  assert.ok(d.every((v) => v === 0));
});

test("a fill started outside the buffer does nothing", () => {
  const d = blank();
  floodFill(d, W, H, -1, 2, RED, whole);
  floodFill(d, W, H, W, 2, RED, whole);
  assert.ok(d.every((v) => v === 0));
});

test("filling with the colour already there does nothing", () => {
  const d = blank();
  setPx(d, 0, 0, RED);
  floodFill(d, W, H, 0, 0, RED, whole);
  assert.deepEqual(px(d, 1, 0), [0, 0, 0, 0]);
});

test("recolours a drawn shape bounded by transparent pixels", () => {
  const d = blank();
  setPx(d, 2, 2, BLUE);
  setPx(d, 3, 2, BLUE);
  floodFill(d, W, H, 2, 2, RED, whole);
  assert.deepEqual(px(d, 2, 2), RED);
  assert.deepEqual(px(d, 3, 2), RED);
  assert.deepEqual(px(d, 4, 2), [0, 0, 0, 0]);
});

describe("fillLayer: a fill stays in the rect it started in", () => {
  const CW = 800;
  const CH = 600;
  const at = (d: Uint8ClampedArray, x: number, y: number) =>
    Array.from(d.slice((y * CW + x) * 4, (y * CW + x) * 4 + 4));
  // The left player of a pair: zone 0–350, strip 350–450 (touching).
  const rects = drawableRects(2, 0);

  test("a fill started in the zone stays out of the adjacent strip", () => {
    const d = new Uint8ClampedArray(CW * CH * 4);
    const filled = fillLayer(d, CW, CH, 100, 300, RED, rects);
    assert.deepEqual(filled, rects[0]);
    assert.deepEqual(at(d, 349, 300), RED);
    assert.deepEqual(at(d, 350, 300), [0, 0, 0, 0]);
    assert.deepEqual(at(d, 400, 10), [0, 0, 0, 0]);
  });

  test("a fill started in a strip stays in that strip", () => {
    const d = new Uint8ClampedArray(CW * CH * 4);
    const filled = fillLayer(d, CW, CH, 400, 300, RED, rects);
    assert.deepEqual(filled, rects[1]);
    assert.deepEqual(at(d, 350, 300), RED);
    assert.deepEqual(at(d, 449, 599), RED);
    assert.deepEqual(at(d, 349, 300), [0, 0, 0, 0]);
    assert.deepEqual(at(d, 450, 300), [0, 0, 0, 0]);
  });

  test("a fill started outside every rect does nothing", () => {
    const d = new Uint8ClampedArray(CW * CH * 4);
    assert.equal(fillLayer(d, CW, CH, 600, 300, RED, rects), null);
    assert.ok(d.every((v) => v === 0));
  });
});
