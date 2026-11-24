import { test } from "node:test";
import assert from "node:assert/strict";
import {
  STRIP_WIDTH,
  drawableRects,
  neighbourAcross,
  seamLayout,
  stripsOf,
} from "../src/lib/seam-geometry";

const span = (r: { x: number; width: number }) => [r.x, r.x + r.width];

test("pair layout", () => {
  const { zones, strips } = seamLayout(2);
  assert.deepEqual(zones.map(span), [
    [0, 350],
    [450, 800],
  ]);
  assert.deepEqual(strips.map(span), [[350, 450]]);
});

test("trio layout", () => {
  const { zones, strips } = seamLayout(3);
  assert.deepEqual(zones.map(span), [
    [0, 200],
    [300, 500],
    [600, 800],
  ]);
  assert.deepEqual(strips.map(span), [
    [200, 300],
    [500, 600],
  ]);
});

test("every rect is full height and strips are STRIP_WIDTH wide", () => {
  for (const size of [2, 3] as const) {
    const { zones, strips } = seamLayout(size);
    for (const r of [...zones, ...strips]) {
      assert.equal(r.y, 0);
      assert.equal(r.height, 600);
    }
    for (const s of strips) assert.equal(s.width, STRIP_WIDTH);
  }
});

test("stripsOf", () => {
  assert.deepEqual(stripsOf(3, 1), [0, 1]);
  assert.deepEqual(stripsOf(3, 0), [0]);
  assert.deepEqual(stripsOf(3, 2), [1]);
  assert.deepEqual(stripsOf(2, 0), [0]);
  assert.deepEqual(stripsOf(2, 1), [0]);
});

test("neighbourAcross", () => {
  assert.equal(neighbourAcross(3, 1, 1), 2);
  assert.equal(neighbourAcross(3, 1, 0), 0);
  assert.equal(neighbourAcross(3, 0, 1), null);
  assert.equal(neighbourAcross(2, 1, 0), 0);
  assert.equal(neighbourAcross(2, 0, 0), 1);
});

test("drawableRects is own zone plus its strips", () => {
  const { zones, strips } = seamLayout(3);
  assert.deepEqual(drawableRects(3, 1), [zones[1], strips[0], strips[1]]);
  assert.deepEqual(drawableRects(3, 0), [zones[0], strips[0]]);
});

test("zones and strips tile 0-800 with no gap or overlap", () => {
  for (const size of [2, 3] as const) {
    const { zones, strips } = seamLayout(size);
    const all = [...zones, ...strips].sort((a, b) => a.x - b.x);
    let edge = 0;
    for (const r of all) {
      assert.equal(r.x, edge);
      edge = r.x + r.width;
    }
    assert.equal(edge, 800);
  }
});
