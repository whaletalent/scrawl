import { test } from "node:test";
import assert from "node:assert/strict";
import { drawStrip } from "../src/lib/strip-image";

const strip = { x: 350, y: 0, width: 100, height: 600 };

function fakeCtx() {
  const calls: unknown[][] = [];
  return {
    calls,
    ctx: { drawImage: (...args: unknown[]) => calls.push(args) },
  };
}

test("draws the kept frame first, then the layer's strip over it", () => {
  const { ctx, calls } = fakeCtx();
  const layer = { name: "layer" };
  const kept = { name: "kept" };
  drawStrip(ctx, layer, strip, kept);
  assert.deepEqual(calls, [
    [kept, 0, 0, 100, 600],
    [layer, 350, 0, 100, 600, 0, 0, 100, 600],
  ]);
});

test("without a kept frame only the layer's strip is drawn", () => {
  const { ctx, calls } = fakeCtx();
  const layer = { name: "layer" };
  drawStrip(ctx, layer, strip, null);
  assert.deepEqual(calls, [[layer, 350, 0, 100, 600, 0, 0, 100, 600]]);
});
