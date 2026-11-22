import type { Browser } from "playwright";
import { SPLIT_DESIGNS } from "../art/split";
import {
  compose,
  enter,
  record,
  roomCode,
  savePng,
  screenshot,
  type Player,
} from "../lib/game";
import { Pen } from "../lib/pen";

/** Split Body allows at most 5 rounds a game. */
const ROUNDS_PER_GAME = 3;

type SplitResult = {
  round: number;
  topImageDataUrl: string;
  bottomImageDataUrl: string;
  silhouetteId: string;
};

/**
 * Plays Split Body with two tabs, one character per round. `only` (1-based)
 * limits which characters are drawn; the turn screenshot is taken whenever
 * character 1 is.
 */
export async function runSplit(browser: Browser, only: number[] = []) {
  const wanted = (
    only.length ? only : SPLIT_DESIGNS.map((_, i) => i + 1)
  ).filter((n) => SPLIT_DESIGNS[n - 1]);
  for (let i = 0; i < wanted.length; i += ROUNDS_PER_GAME)
    await playGame(browser, wanted.slice(i, i + ROUNDS_PER_GAME));
}

async function playGame(browser: Browser, numbers: number[]) {
  const host = await enter(browser, "Duda", "new", {
    gameMode: "split-body",
    totalRounds: numbers.length,
    turnDuration: 90,
  });
  const code = await roomCode(host);
  const guest = await enter(browser, "Caio", code);
  await roomCode(guest);
  await host.page.getByRole("button", { name: "Começar Split Body" }).click();

  const silhouettes: string[] = [];
  for (let round = 1; round <= numbers.length; round++) {
    const number = numbers[round - 1];
    const design = SPLIT_DESIGNS[number - 1];
    const turn = async (player: Player, seed: number, shake: number) => {
      const start = await player.next("split-round-start");
      const side = start.side as "top" | "bottom";
      silhouettes[round - 1] = start.silhouetteId as string;
      const { page } = player;
      await page
        .getByRole("paragraph")
        .filter({ hasText: `Rodada ${round}/${numbers.length}` })
        .waitFor();
      await page.getByRole("button", { name: "Enviar Desenho" }).waitFor();
      const pen = new Pen(page, {
        side,
        seed: seed + number,
        shake,
        onMark:
          number === 1 && side === "top"
            ? () => screenshot(page, "screen-split-drawing.png")
            : undefined,
      });
      await (side === "top" ? design.drawTop(pen) : design.drawBottom(pen));
      for (const leak of pen.leaks)
        console.warn(`split ${number} ${side}: fill leaked — ${leak}`);
      return page;
    };
    const pages = await Promise.all([
      turn(host, 100, 1.8),
      turn(guest, 200, 2.8),
    ]);
    for (const page of pages)
      await page.getByRole("button", { name: "Enviar Desenho" }).click();
  }

  const final = await host.next("split-final-results");
  for (const d of final.drawings as SplitResult[]) {
    const number = numbers[d.round - 1];
    const design = SPLIT_DESIGNS[number - 1];
    const file = `drawing-split-${number}.png`;
    savePng(
      file,
      await compose(host.page, [
        { src: d.topImageDataUrl, x: 0, y: 0, w: 800, h: 300 },
        { src: d.bottomImageDataUrl, x: 0, y: 300, w: 800, h: 300 },
      ]),
    );
    await record({
      [file]: {
        mode: "split-body",
        silhouette: silhouettes[d.round - 1],
        top: design.top,
        bottom: design.bottom,
      },
    });
  }
  await host.page.context().close();
  await guest.page.context().close();
}
