/**
 * Produces the pictures of the landing page (scripts/landing-art/captures/, then compose.mjs) by
 * playing real games in real browser tabs: every stroke is a mouse drag on the
 * game's own canvas, every picture is what the game's final screen shows.
 *
 * Needs two servers on ports nothing else uses, with accounts OFF so every
 * tab is a guest (repo root, Node 24):
 *
 *   PORT=8093 npx tsx apps/ws-server/src/server.ts
 *   NEXT_PUBLIC_WS_URL=ws://localhost:8093 NEXT_DIST_DIR=.next-capture \
 *     NEXT_PUBLIC_SUPABASE_URL= NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY= \
 *     npx next dev apps/web --port 3103
 *
 * (`next dev` rewrites apps/web/tsconfig.json to include its dist dir: undo
 * that and delete apps/web/.next-capture/ afterwards.) Keep the game server
 * at the default PHASE_TIME_SCALE: the party drawing phase is sized by
 * LANDING_ART_TURN (seconds, default 90) and the other party phases can't be
 * skipped, so a larger scale only makes the run longer.
 *
 *   npx tsx scripts/landing-art/capture.ts            # everything, ~10 min
 *   npx tsx scripts/landing-art/capture.ts split      # 6 characters + screen-split-drawing
 *   npx tsx scripts/landing-art/capture.ts face       # 4 faces + screen-face-drawing
 *   npx tsx scripts/landing-art/capture.ts party      # 6 drawings + the four party screens
 *   npx tsx scripts/landing-art/capture.ts split 4    # only drawing-split-4.png
 *   npx tsx scripts/landing-art/capture.ts face 2 3   # only those faces
 *   npx tsx scripts/landing-art/capture.ts party 5 6  # two themes, quick 4-player round, no screens
 *
 * Strokes are seeded, so a rerun draws the same pictures; who gets which
 * side, silhouette or face region is the server's choice. `drawings.json`,
 * written next to the pictures, says what each one is.
 */
import { chromium } from "playwright";
import { runFace } from "./modes/face";
import { runParty, runPartyPair } from "./modes/party";
import { runSplit } from "./modes/split";

const [mode = "all", ...rest] = process.argv.slice(2);
const only = rest.map(Number).filter((n) => n > 0);

async function main() {
  const browser = await chromium.launch();
  try {
    if (mode === "all" || mode === "split") await runSplit(browser, only);
    if (mode === "all" || mode === "face") await runFace(browser, only);
    if (mode === "all" || mode === "party") {
      // With numbers: a quick 4-player game that redraws just two themes.
      if (only.length > 0) await runPartyPair(browser, only);
      else await runParty(browser);
    }
  } finally {
    await browser.close();
  }
}

void main();
