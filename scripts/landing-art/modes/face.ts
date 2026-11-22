import type { Browser } from "playwright";
import { FACE_DESIGNS } from "../art/face";
import {
  enter,
  record,
  roomCode,
  savePng,
  screenshot,
  type Player,
} from "../lib/game";
import { Pen, type FaceRegion } from "../lib/pen";

/**
 * Plays one single-round Face Builder game per face, each with its own
 * template and skin tone. `only` (1-based) limits which faces are drawn; the
 * turn screenshot is taken whenever face 1 is.
 */
export async function runFace(browser: Browser, only: number[] = []) {
  const wanted = (
    only.length ? only : FACE_DESIGNS.map((_, i) => i + 1)
  ).filter((n) => FACE_DESIGNS[n - 1]);
  for (const number of wanted) await playGame(browser, number);
}

async function playGame(browser: Browser, number: number) {
  const design = FACE_DESIGNS[number - 1];
  const host = await enter(browser, "Bia", "new", {
    gameMode: "face-builder",
    totalRounds: 1,
    turnDuration: 90,
    faceTemplate: design.faceTemplate,
    skinTone: design.skinTone,
  });
  const code = await roomCode(host);
  const guest = await enter(browser, "Léo", code);
  await roomCode(guest);
  await host.page.getByRole("button", { name: "Começar Face Builder" }).click();

  const turn = async (player: Player, seed: number, shake: number) => {
    const start = await player.next("face-round-start");
    const regions = start.regions as FaceRegion[];
    const { page } = player;
    await page.getByRole("button", { name: "Enviar Desenho" }).waitFor();
    const pen = new Pen(page, { face: true, seed: seed + number, shake });
    for (const [i, region] of regions.entries()) {
      pen.region(region);
      await design.regions[region](pen);
      if (number === 1 && player === host && i === 1)
        await screenshot(page, "screen-face-drawing.png");
    }
    for (const leak of pen.leaks)
      console.warn(`face ${number}: fill leaked — ${leak}`);
    return regions;
  };
  const [hostRegions, guestRegions] = await Promise.all([
    turn(host, 300, 1.6),
    turn(guest, 400, 2.6),
  ]);
  for (const { page } of [host, guest])
    await page.getByRole("button", { name: "Enviar Desenho" }).click();

  // The final screen composes template + both layers on a canvas of its own.
  await host.next("face-final-results");
  await host.page.getByText("Resultado!").waitFor();
  await host.page.waitForTimeout(1500);
  const file = `drawing-face-${number}.png`;
  savePng(
    file,
    await host.page
      .locator("canvas")
      .evaluate((c: HTMLCanvasElement) => c.toDataURL("image/png")),
  );
  await record({
    [file]: {
      mode: "face-builder",
      faceTemplate: design.faceTemplate,
      skinTone: design.skinTone,
      subject: design.name,
      regions: { Bia: hostRegions, Léo: guestRegions },
    },
  });
  await host.page.context().close();
  await guest.page.context().close();
}
