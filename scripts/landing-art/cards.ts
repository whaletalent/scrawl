/**
 * The result cards of the landing's "Sua arte horrível vira lenda" carousel:
 * each finished drawing (captures/drawing-*.png) on a white card, the way
 * the final screen shows it: the round, the theme, who drew it.
 *
 * The carousel draws its cards in WebGL, so every card has to be one picture.
 * This renders them in a browser (for the page's own fonts) into
 * captures/card-*.png; compose.mjs turns them into webp.
 *
 *   npx tsx scripts/landing-art/cards.ts
 *
 * Needs no server. Re-run it after capture.ts changes the drawings.
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const RAW = path.resolve("scripts/landing-art/captures");
type Entry = {
  mode: "party" | "split-body" | "face-builder";
  theme?: string;
  left?: string;
  right?: string;
  top?: string;
  bottom?: string;
  subject?: string;
};
const index: Record<string, Entry> = JSON.parse(
  readFileSync(path.join(RAW, "drawings.json"), "utf8"),
);

/** The drawings on the carousel, in order. Party drawings alternate with the others. */
export const CARDS = [
  "drawing-party-1",
  "drawing-split-1",
  "drawing-party-2",
  "drawing-face-1",
  "drawing-party-3",
  "drawing-split-2",
  "drawing-party-4",
  "drawing-face-2",
  "drawing-party-5",
  "drawing-split-6",
  "drawing-party-6",
  "drawing-face-4",
];

function describe(name: string) {
  const d = index[`${name}.png`];
  if (d.mode === "party")
    return {
      line: `Rodada ${((Number(name.at(-1)) - 1) % 3) + 1}`,
      title: d.theme!,
      authors: [d.left!, d.right!],
    };
  if (d.mode === "split-body")
    return {
      line: "Monstrinho",
      title: `${d.top} com ${d.bottom}`,
      authors: ["Bia", "Léo"],
    };
  return {
    line: "Caricatura a dois",
    title: d.subject!,
    authors: ["Bia", "Léo"],
  };
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);

function html(name: string) {
  const { line, title, authors } = describe(name);
  const png = readFileSync(path.join(RAW, `${name}.png`)).toString("base64");
  const people = authors
    .map(
      (a) =>
        `<span class="who"><span class="dot">${esc(a[0])}</span>${esc(a)}</span>`,
    )
    .join(`<span class="plus">+</span>`);
  return `<!doctype html><html><head>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Shantell+Sans:wght@800&family=Figtree:wght@500;600&display=block">
<style>
  html, body { margin: 0; background: transparent; }
  .card { box-sizing: border-box; width: 300px; height: 380px; padding: 22px 16px 16px; background: #fff;
    position: relative; display: flex; flex-direction: column; gap: 8px; color: #33200f; font-family: Figtree, sans-serif; }
  .tape { position: absolute; top: 0; left: 50%; width: 96px; height: 14px; margin-left: -48px; background: #f6e7b9; }
  .pic { display: block; width: 100%; aspect-ratio: 4 / 3; object-fit: cover; border: 3px solid #efe6cf; box-sizing: border-box; }
  .line { margin: 4px 0 0; font-size: 15px; color: #5a4733; }
  .title { margin: 0; font: 800 23px/1.1 "Shantell Sans", sans-serif; letter-spacing: -0.01em;
    display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .people { margin-top: auto; display: flex; align-items: center; gap: 6px; font-size: 16px; font-weight: 500; }
  .who { display: inline-flex; align-items: center; gap: 6px; }
  .dot { display: inline-grid; place-items: center; width: 22px; height: 22px; border-radius: 50%; background: #ffb224;
    font-size: 11px; font-weight: 600; }
</style></head><body>
<div class="card"><span class="tape"></span>
  <img class="pic" src="data:image/png;base64,${png}">
  <p class="line">${esc(line)}</p>
  <p class="title">“${esc(title)}”</p>
  <div class="people">${people}</div>
</div></body></html>`;
}

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 300, height: 380 },
    deviceScaleFactor: 2,
  });
  const meta: Record<string, { text: string; alt: string }> = {};
  for (const name of CARDS) {
    await page.setContent(html(name), { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    const file = name.replace("drawing-", "card-");
    await page
      .locator(".card")
      .screenshot({ path: path.join(RAW, `${file}.png`) });
    const { line, title, authors } = describe(name);
    meta[file] = {
      text: title,
      alt: `${line}: “${title}”, de ${authors.join(" e ")}`,
    };
    console.log(`wrote ${file}.png`);
  }
  // What the page needs to label each card (its alt text).
  writeFileSync(
    path.join(RAW, "cards.json"),
    JSON.stringify(meta, null, 2) + "\n",
  );
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
