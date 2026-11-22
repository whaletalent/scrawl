// Turns the raw captures in scripts/landing-art/captures/ (PNG, written by
// capture.ts) into what the landing page loads from apps/web/public/landing/:
//   - every drawing-*.png / screen-*.png  ->  .webp, sized for the page
//   - a half-width "-sm" copy of each, for srcset
//   - share.jpg: the link-preview card (1200x630), drawings on the brand orange
//
//   node scripts/landing-art/compose.mjs
//
// `sharp` comes with Next.js (it is not a direct dependency of this repo).
import { readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const RAW = path.join(HERE, "captures");
const OUT = path.resolve(HERE, "../../apps/web/public/landing");
const raw = (name) => path.join(RAW, name);
const out = (name) => path.join(OUT, name);

/** The brand orange, as on the page (kit.tsx, --p-accent). */
const GROUND = "#d63c17";
/** Drawings on the key art, column by column, top to bottom. */
const KEY_ART = [
  ["drawing-split-1", "drawing-party-5", "drawing-face-4", "drawing-split-6"],
  ["drawing-party-1", "drawing-face-1", "drawing-party-6", "drawing-split-5"],
];

async function toWebp() {
  const names = (await readdir(RAW)).filter((n) =>
    /^(drawing|screen)-.*\.png$/.test(n),
  );
  for (const name of names) {
    if (name === "screen-lobby.png") {
      await lobby(name);
      continue;
    }
    const width = name.startsWith("screen-") ? 1600 : 800;
    await sharp(raw(name))
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: 82 })
      .toFile(out(name.replace(/\.png$/, ".webp")));
  }
  return names.length;
}

/**
 * The lobby is a narrow column in a wide, empty window: keep its top half
 * (the room code, the invite link, the first players) with some of its own
 * background around it, at 2:1.
 */
async function lobby(name) {
  const trimmed = await sharp(raw(name)).trim({ threshold: 12 }).toBuffer();
  const { width: w, height: h } = await sharp(trimmed).metadata();
  const { dominant } = await sharp(raw(name))
    .extract({ left: 0, top: 0, width: 16, height: 16 })
    .stats();
  const keep = Math.round(h * 0.52);
  const top = Math.round(keep * 0.12);
  const height = keep + top;
  const width = height * 2;
  // sharp resizes before it extends, whatever the order written: two passes.
  const padded = await sharp(trimmed)
    .extract({ left: 0, top: 0, width: w, height: keep })
    .extend({
      top,
      left: Math.round((width - w) / 2),
      right: Math.ceil((width - w) / 2),
      background: dominant,
    })
    .png()
    .toBuffer();
  await sharp(padded)
    .resize({ width: 1600, withoutEnlargement: true })
    .webp({ quality: 82 })
    .toFile(out(name.replace(/\.png$/, ".webp")));
}

/** One drawing as a sheet of paper with round corners. */
async function sheet(name, width, height) {
  const radius = 28;
  const mask = Buffer.from(
    `<svg width="${width}" height="${height}"><rect width="${width}" height="${height}" rx="${radius}" ry="${radius}"/></svg>`,
  );
  return sharp(raw(`${name}.png`))
    .resize(width, height, { fit: "cover" })
    .flatten({ background: "#ffffff" })
    .composite([{ input: mask, blend: "dest-in" }])
    .png()
    .toBuffer();
}

async function keyArt() {
  const W = 2400;
  const H = 1500;
  const sheetW = 570;
  const sheetH = 428;
  const gap = 36;
  // Two columns on the right, running off the top and the bottom edge; the
  // left half stays empty for the headline.
  const columns = [
    { x: 1210, y: -150 },
    { x: 1210 + sheetW + gap, y: 96 },
  ];
  const layers = [];
  for (const [c, names] of KEY_ART.entries()) {
    for (const [r, name] of names.entries()) {
      const top = columns[c].y + r * (sheetH + gap);
      if (top >= H) continue;
      const full = await sheet(name, sheetW, sheetH);
      // sharp can't composite past the canvas: crop what runs off it.
      const cropTop = Math.max(0, -top);
      const cropH = Math.min(sheetH - cropTop, H - Math.max(top, 0));
      const input = await sharp(full)
        .extract({ left: 0, top: cropTop, width: sheetW, height: cropH })
        .toBuffer();
      layers.push({ input, left: columns[c].x, top: Math.max(top, 0) });
    }
  }
  const art = sharp({
    create: { width: W, height: H, channels: 3, background: GROUND },
  }).composite(layers);
  const png = await art.png().toBuffer();
  // The share card: the same picture, cut to 1200x630 around the sheets.
  await sharp(png)
    .extract({ left: 420, top: 230, width: 1980, height: 1040 })
    .resize(1200, 630)
    .jpeg({ quality: 86 })
    .toFile(out("share.jpg"));
}

/** A half-width copy of every picture, for `srcset` (small screens, small slots). */
async function smallCopies() {
  const names = (await readdir(OUT)).filter(
    (n) =>
      n.endsWith(".webp") && !/-sm\.webp$/.test(n) && !/^(mode-|logo)/.test(n),
  );
  for (const name of names) {
    const { width } = await sharp(out(name)).metadata();
    await sharp(out(name))
      .resize({ width: Math.round(width / 2) })
      .webp({ quality: 80 })
      .toFile(out(name.replace(/\.webp$/, "-sm.webp")));
  }
}

/**
 * The 3D mascots (scripts/landing-art/mascots/, generated by the owner).
 * Some came with a glow baked into half-transparent pixels, which turns into
 * a dirty halo on the orange ground: `solid` keeps only what is nearly opaque.
 */
const MASCOTS = path.join(HERE, "mascots");

async function cutout(input, { solid = false, width }) {
  let img = sharp(input).ensureAlpha();
  if (solid) {
    const { data, info } = await img
      .raw()
      .toBuffer({ resolveWithObject: true });
    for (let i = 3; i < data.length; i += 4) {
      const a = data[i];
      data[i] = a < 225 ? 0 : Math.round(((a - 225) / 30) * 255);
    }
    img = sharp(data, { raw: info });
  }
  const trimmed = await img.png().toBuffer();
  return sharp(await sharp(trimmed).trim().toBuffer())
    .resize({ width, withoutEnlargement: true })
    .webp({ quality: 88 });
}

async function mascots() {
  const src = (name) => path.join(MASCOTS, name);
  await (
    await cutout(src("rocket.png"), { width: 1400 })
  ).toFile(out("mascot-rocket.webp"));
  await (
    await cutout(src("flyer.png"), { solid: true, width: 600 })
  ).toFile(out("mascot-flyer.webp"));
  await (
    await cutout(src("trophy.png"), { width: 800 })
  ).toFile(out("mascot-trophy.webp"));
  // One picture, three toys side by side: one per game mode.
  const { width, height } = await sharp(src("trio.png")).metadata();
  const third = Math.floor(width / 3);
  for (const [i, mode] of ["party", "split-body", "face-builder"].entries()) {
    const part = await sharp(src("trio.png"))
      .extract({ left: i * third + 20, top: 0, width: third - 40, height })
      .png()
      .toBuffer();
    await (
      await cutout(part, { solid: true, width: 320 })
    ).toFile(out(`mode-${mode}.webp`));
  }
  // The app icon: in the nav and the footer, and as the site's favicon.
  const APP = path.resolve(HERE, "../../apps/web/src/app");
  await sharp(src("icon.jpg"))
    .resize(192)
    .webp({ quality: 90 })
    .toFile(out("logo.webp"));
  await sharp(src("icon.jpg"))
    .resize(256)
    .png()
    .toFile(path.join(APP, "icon.png"));
  await sharp(src("icon.jpg"))
    .resize(180)
    .png()
    .toFile(path.join(APP, "apple-icon.png"));
}

const converted = await toWebp();
await mascots();
await keyArt();
await smallCopies();
console.log(`landing art: ${converted} captures converted, key art composed`);
