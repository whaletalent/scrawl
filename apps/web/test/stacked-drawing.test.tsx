import { test } from "node:test";
import assert from "node:assert/strict";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { StackedDrawing } from "../src/components/canvas/stacked-drawing";

// The app's JSX is compiled by Next; here tsx emits classic React.createElement.
Object.assign(globalThis, { React });

const IMG = "data:image/png;base64,AAAA";

test("each member's layer is cut to their own zone and strips", () => {
  const html = renderToStaticMarkup(
    <StackedDrawing layers={[IMG, IMG, IMG]} frames={[]} size={3} alt="x" />,
  );
  const clips = [...html.matchAll(/clip-path:([^;"]+)/g)].map((m) =>
    m[1].trim(),
  );
  // Trio: member 0 owns 0–300, member 1 200–600, member 2 500–800.
  assert.deepEqual(clips, [
    "inset(0% 62.5% 0% 0%)",
    "inset(0% 25% 0% 25%)",
    "inset(0% 0% 0% 62.5%)",
  ]);
});

test("results without strip frames (an older server) still render", () => {
  const html = renderToStaticMarkup(
    <StackedDrawing layers={[IMG, null]} size={2} alt="x" />,
  );
  assert.equal(html.match(/<img/g)?.length, 1);
});
