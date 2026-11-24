/**
 * Players for the capture run: each one is a real browser tab on the room
 * page, entered the way the landing page sends people there (the chosen
 * options in sessionStorage, see apps/web/src/lib/room-options.ts).
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { Browser, Page } from "playwright";
import { format } from "prettier";

export const WEB_URL = process.env.LANDING_ART_WEB ?? "http://localhost:3103";
/** Run from the repo root, like every other script here. */
// Raw captures stay out of the site: compose.mjs turns them into what ships.
export const OUT_DIR = path.resolve("scripts/landing-art/captures");

export type Msg = { type: string } & Record<string, unknown>;

export interface Player {
  name: string;
  page: Page;
  /** Every message the game server sent this tab, in order. */
  msgs: Msg[];
  /** The next (or an already received, not yet consumed) message of a type. */
  next(type: string, timeoutMs?: number): Promise<Msg>;
}

export interface RoomOptions {
  gameMode: "party" | "split-body" | "face-builder";
  totalRounds?: number;
  turnDuration?: number;
  faceTemplate?: string;
  skinTone?: string;
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Opens a tab and enters a room: `code` "new" creates it with `options`. */
export async function enter(
  browser: Browser,
  name: string,
  code: string,
  options?: RoomOptions,
): Promise<Player> {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });
  const storage: Record<string, string> = { "scrawl-nickname": name };
  if (options) {
    storage["scrawl-gameMode"] = options.gameMode;
    storage["scrawl-totalRounds"] = String(options.totalRounds ?? 1);
    storage["scrawl-turnDuration"] = String(options.turnDuration ?? 300);
    storage["scrawl-faceTemplate"] = options.faceTemplate ?? "random";
    storage["scrawl-skinTone"] = options.skinTone ?? "#FDDCB5";
    storage["scrawl-visibility"] = "private";
  }
  await context.addInitScript((entries) => {
    for (const [k, v] of Object.entries(entries)) sessionStorage.setItem(k, v);
    // The Next.js dev badge and overlay are not part of the game.
    document.addEventListener("DOMContentLoaded", () => {
      const style = document.createElement("style");
      style.textContent = "nextjs-portal{display:none!important}";
      document.head.appendChild(style);
    });
  }, storage);

  const page = await context.newPage();
  const msgs: Msg[] = [];
  let read = 0;
  page.on("websocket", (ws) =>
    ws.on("framereceived", (frame) => {
      try {
        msgs.push(JSON.parse(String(frame.payload)));
      } catch {
        // not a game message
      }
    }),
  );
  const player: Player = {
    name,
    page,
    msgs,
    async next(type, timeoutMs = 60_000) {
      const deadline = Date.now() + timeoutMs;
      for (;;) {
        for (; read < msgs.length; read++)
          if (msgs[read].type === type) return msgs[read++];
        if (Date.now() > deadline)
          throw new Error(`${name}: no "${type}" within ${timeoutMs}ms`);
        await sleep(50);
      }
    },
  };
  await page.goto(`${WEB_URL}/room/?code=${code}`);
  return player;
}

/** The room code the server gave this player. */
export async function roomCode(p: Player): Promise<string> {
  const m = await p.next("room-state");
  return (m.state as { code: string }).code;
}

export type Part = { src: string; x: number; y: number; w: number; h: number };

/**
 * Flattens the parts of a finished drawing into one 800×600 PNG, the same way
 * apps/web/src/lib/compose-drawing.ts does for the gallery: white paper, then
 * each player's image in its place.
 */
export function compose(page: Page, parts: Part[]): Promise<string> {
  return page.evaluate(async (list) => {
    const canvas = document.createElement("canvas");
    canvas.width = 800;
    canvas.height = 600;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, 800, 600);
    for (const part of list) {
      if (!part.src) continue;
      const img = new Image();
      await new Promise((ok, fail) => {
        img.onload = ok;
        img.onerror = fail;
        img.src = part.src;
      });
      ctx.drawImage(img, part.x, part.y, part.w, part.h);
    }
    return canvas.toDataURL("image/png");
  }, parts);
}

export function savePng(file: string, dataUrl: string) {
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(
    path.join(OUT_DIR, file),
    Buffer.from(dataUrl.replace(/^data:image\/png;base64,/, ""), "base64"),
  );
  console.log(`wrote ${file}`);
}

/**
 * The landing shows these screens flat on its own sheets, so the shots leave
 * out the game's hard shadows (and the drawing trail on the desk).
 */
const FLAT_CSS = `
  *, *::before, *::after { box-shadow: none !important; }
  [data-desk-trail] { display: none !important; }
`;

export async function screenshot(page: Page, file: string) {
  mkdirSync(OUT_DIR, { recursive: true });
  const style = await page.addStyleTag({ content: FLAT_CSS });
  await page.screenshot({ path: path.join(OUT_DIR, file) });
  await style.evaluate((el) => el.remove());
  console.log(`wrote ${file}`);
}

/** Adds entries to `drawings.json`, the index of what each picture is. */
export async function record(entries: Record<string, object>) {
  const file = path.join(OUT_DIR, "drawings.json");
  let all: Record<string, object> = {};
  try {
    all = JSON.parse(readFileSync(file, "utf8"));
  } catch {
    // first run
  }
  Object.assign(all, entries);
  const sorted = Object.fromEntries(
    Object.entries(all).sort(([a], [b]) =>
      a.localeCompare(b, "en", { numeric: true }),
    ),
  );
  mkdirSync(OUT_DIR, { recursive: true });
  // Formatted like the rest of the repo, so `npm run format:check` stays green.
  writeFileSync(file, await format(JSON.stringify(sorted), { parser: "json" }));
}
