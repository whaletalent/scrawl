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

/*
  The page never shows a whole window: each picture is one part of a screen.
  The captures are 2880x1800 (a 1440x900 window at 2x).
  - "desk": the drawing paper with its two rails, found by looking for what
    is not desk-coloured, then widened to 16:10.
  - a rectangle: read off the capture; check the result after re-capturing,
    since these follow the layout of the screen.
*/
const CUTS = {
  // the drawing screens share one layout: the paper and its two rails, 16:10,
  // without the round strip above or the player chips below
  "screen-party-drawing.png": {
    left: 420,
    top: 177,
    width: 2040,
    height: 1275,
  },
  "screen-split-drawing.png": {
    left: 420,
    top: 177,
    width: 2040,
    height: 1275,
  },
  "screen-face-drawing.png": { left: 420, top: 177, width: 2040, height: 1275 },
  // one drawing to vote on, with its 1st / 2nd / 3rd buttons
  "screen-party-voting.png": { left: 376, top: 566, width: 1046, height: 1050 },
  // the final screen's "obras-primas" paper
  "screen-party-results.png": {
    left: 1012,
    top: 234,
    width: 1752,
    height: 1154,
  },
  // the lobby: the players who arrived and the start button
  "screen-lobby.png": {
    left: 1184,
    top: 226,
    width: 1536,
    height: 1368,
    // the sheet's folded corner shows the desk behind it: paper over it
    paperCorner: 108,
  },
};

const DESK = [0xd6, 0x3c, 0x17];

/** The box around the paper and its rails, as a 16:10 rectangle. */
async function deskCut(file) {
  const scale = 10;
  const { data, info } = await sharp(file)
    .resize({ width: 288 })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const paper = (x, y) => {
    const i = (y * w + x) * 3;
    return (
      Math.abs(data[i] - DESK[0]) +
        Math.abs(data[i + 1] - DESK[1]) +
        Math.abs(data[i + 2] - DESK[2]) >
      90
    );
  };
  // Rows the paper crosses: over half of the row is not desk.
  const rows = [];
  for (let y = 0; y < h; y++) {
    let n = 0;
    for (let x = 0; x < w; x++) if (paper(x, y)) n++;
    if (n > w * 0.5) rows.push(y);
  }
  // Columns of the paper and of the rails: not desk on a third of those rows.
  const cols = [];
  for (let x = 0; x < w; x++) {
    let n = 0;
    for (const y of rows) if (paper(x, y)) n++;
    if (n > rows.length * 0.3) cols.push(x);
  }
  // A little desk on each side; hardly any above, where the theme's tag is.
  const padX = 4;
  const padY = 1;
  let left = (cols[0] - padX) * scale;
  let top = (rows[0] - padY) * scale;
  let width = (cols.at(-1) - cols[0] + 1 + padX * 2) * scale;
  let height = (rows.at(-1) - rows[0] + 1 + padY * 2) * scale;
  // Widen or heighten around the middle until it is 16:10.
  if (width / height < 1.6) {
    const wider = Math.round(height * 1.6);
    left -= Math.round((wider - width) / 2);
    width = wider;
  } else {
    const taller = Math.round(width / 1.6);
    top -= Math.round((taller - height) / 2);
    height = taller;
  }
  left = Math.max(0, Math.min(left, 2880 - width));
  top = Math.max(0, Math.min(top, 1800 - height));
  return { left, top, width, height };
}

async function toWebp() {
  const names = (await readdir(RAW)).filter((n) =>
    /^(drawing|screen|card)-.*\.png$/.test(n),
  );
  for (const name of names) {
    // cards (cards.ts) are drawn by the carousel at about 300px wide: 2x is plenty
    const width = name.startsWith("screen-")
      ? 1600
      : name.startsWith("card-")
        ? 600
        : 800;
    const how = CUTS[name];
    const cut = how === "desk" ? await deskCut(raw(name)) : how;
    let image = cut
      ? sharp(raw(name)).extract({
          left: cut.left,
          top: cut.top,
          width: cut.width,
          height: cut.height,
        })
      : sharp(raw(name));
    if (cut?.paperCorner) {
      const c = cut.paperCorner;
      image = sharp(await image.png().toBuffer()).composite([
        {
          input: Buffer.from(
            `<svg width="${c}" height="${c}"><rect width="${c}" height="${c}" fill="#fffdf6"/></svg>`,
          ),
          left: cut.width - c,
          top: 0,
        },
      ]);
    }
    await image
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: 84 })
      .toFile(out(name.replace(/\.png$/, ".webp")));
  }
  return names.length;
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
      n.endsWith(".webp") &&
      !/-sm\.webp$/.test(n) &&
      !/^(mode-|logo|card-|note-|mascot-(join|code|head))/.test(n),
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
  // One picture, three toys side by side: one per game mode. They are not
  // the same width, so each is cut at the empty columns between them.
  const trio = await sharp(src("trio.png"))
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height } = trio.info;
  const filled = [];
  for (let x = 0; x < width; x++) {
    let n = 0;
    for (let y = 0; y < height; y++)
      if (trio.data[(y * width + x) * 4 + 3] >= 225) n++;
    filled.push(n > 2);
  }
  // Runs of filled columns, the three widest being the toys.
  const runs = [];
  for (let x = 0; x < width; x++) {
    if (!filled[x]) continue;
    const last = runs.at(-1);
    if (last && x - last.end <= 6) last.end = x;
    else runs.push({ start: x, end: x });
  }
  const toys = runs
    .sort((a, b) => b.end - b.start - (a.end - a.start))
    .slice(0, 3)
    .sort((a, b) => a.start - b.start);
  for (const [i, mode] of ["party", "split-body", "face-builder"].entries()) {
    const left = Math.max(0, toys[i].start - 4);
    const right = Math.min(width, toys[i].end + 5);
    const part = await sharp(src("trio.png"))
      .extract({ left, top: 0, width: right - left, height })
      .png()
      .toBuffer();
    await (
      await cutout(part, { solid: true, width: 320 })
    ).toFile(out(`mode-${mode}.webp`));
  }
  // Each mode's drawing on a sticky note with a curled corner (the modes' cards).
  for (const mode of ["party", "split-body", "face-builder"])
    await (
      await cutout(src(`note-${mode}.png`), { width: 520 })
    ).toFile(out(`note-${mode}.webp`));
  // The home's two big buttons: create a room (the door), join with a code (the ticket).
  await (
    await cutout(src("join.png"), { width: 480 })
  ).toFile(out("mascot-join.webp"));
  await (
    await cutout(src("code.png"), { width: 480 })
  ).toFile(out("mascot-code.webp"));
  await (
    await cutout(src("head.png"), { width: 600 })
  ).toFile(out("mascot-head.webp"));
  // The logo: the robot's head. Bare in the nav and on the wordmark; on the
  // brand orange, as a square, for the favicon and the home-screen icon.
  const APP = path.resolve(HERE, "../../apps/web/src/app");
  const head = await sharp(src("head.png")).trim().png().toBuffer();
  await sharp(head)
    .resize(192, 192, { fit: "contain", background: "#0000" })
    .webp({ quality: 90 })
    .toFile(out("logo.webp"));
  const onOrange = async (size) =>
    sharp({
      create: { width: size, height: size, channels: 4, background: GROUND },
    }).composite([
      {
        input: await sharp(head)
          .resize(Math.round(size * 0.8), Math.round(size * 0.8), {
            fit: "contain",
            background: "#0000",
          })
          .toBuffer(),
        gravity: "centre",
      },
    ]);
  await (await onOrange(256)).png().toFile(path.join(APP, "icon.png"));
  await (await onOrange(180)).png().toFile(path.join(APP, "apple-icon.png"));
}

const converted = await toWebp();
await mascots();
await keyArt();
await smallCopies();
console.log(`landing art: ${converted} captures converted, key art composed`);
