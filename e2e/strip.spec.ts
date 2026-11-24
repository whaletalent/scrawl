import { test, expect, type Browser, type Page } from "@playwright/test";
import { connect, type, type TestClient } from "../apps/ws-server/test/client";
import { autoplayParty, bot, draw, failOnPageErrors, WS_URL } from "./helpers";

const CANVAS = "canvas:not([data-desk-trail])";

interface Table {
  bots: TestClient[];
  pages: Page[];
  close(): Promise<void>;
}

/**
 * A Racha-tema room with two real pages (Ana, Bia) and two bots, started and
 * in its drawing turn. The server shuffles the pairs, so the pages may or may
 * not draw together: the caller looks and sets up a new room if not.
 */
async function sitDown(browser: Browser): Promise<Table> {
  const host = await connect(WS_URL, "Caio");
  const created = host.wait(type("room-state"));
  host.send({
    type: "create-room",
    nickname: "Caio",
    gameMode: "party",
    totalRounds: 1,
    turnDuration: 180,
  });
  const code: string = (await created).state.code;
  const duda = await bot(code, "Duda");
  for (const b of [host, duda]) autoplayParty(b);

  const contexts = await Promise.all([
    browser.newContext(),
    browser.newContext(),
  ]);
  const pages = await Promise.all(contexts.map((c) => c.newPage()));
  await Promise.all(
    pages.map(async (page, i) => {
      const name = ["Ana", "Bia"][i];
      await page.goto(`/room/?code=${code}`);
      await page.getByPlaceholder("Seu apelido").fill(name);
      await page.getByPlaceholder("Seu apelido").press("Enter");
      await expect(page.getByText(`${name} (você)`)).toBeVisible();
    }),
  );
  host.send({ type: "start-game" });
  // Nobody here sends a theme: the (shortened) theme timer runs out.
  for (const page of pages)
    await expect(page.getByText(/^Área de /)).toBeVisible({ timeout: 30_000 });

  return {
    bots: [host, duda],
    pages,
    close: async () => {
      for (const b of [host, duda]) b.close();
      await Promise.all(contexts.map((c) => c.close()));
    },
  };
}

/** Opaque pixels in the images laid over this page's canvas (the partner's strip frames). */
function overlayInk(page: Page): Promise<number> {
  return page.locator(CANVAS).evaluate(async (canvas: HTMLCanvasElement) => {
    let ink = 0;
    for (const img of canvas.parentElement!.querySelectorAll("img")) {
      await img.decode().catch(() => {});
      if (!img.naturalWidth) continue;
      const c = document.createElement("canvas");
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      const ctx = c.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      const { data } = ctx.getImageData(0, 0, c.width, c.height);
      for (let i = 3; i < data.length; i += 4) if (data[i] > 0) ink++;
    }
    return ink;
  });
}

/** Each overlay image's left and right edge, as fractions of the canvas width. */
function overlaySpans(page: Page): Promise<[number, number][]> {
  return page.locator(CANVAS).evaluate((canvas: HTMLCanvasElement) => {
    const box = canvas.getBoundingClientRect();
    return [...canvas.parentElement!.querySelectorAll("img")].map((img) => {
      const r = img.getBoundingClientRect();
      return [
        (r.left - box.left) / box.width,
        (r.right - box.left) / box.width,
      ] as [number, number];
    });
  });
}

test("Racha-tema: the partner sees my strip live, not my side", async ({
  browser,
}) => {
  test.setTimeout(300_000);

  // The pairs are random: a new room until Ana and Bia draw together. Each
  // try pairs them with probability 1/3; 20 tries all missing is ~3 in 10,000.
  let table: Table | null = null;
  for (let attempt = 0; attempt < 20 && !table; attempt++) {
    const t = await sitDown(browser);
    const together = await t.pages[0].getByText("Área de Bia").isVisible();
    if (together) table = t;
    else await t.close();
  }
  if (!table) throw new Error("Ana and Bia were never paired");
  const [ana, bia] = table.pages;
  const errors = [failOnPageErrors(ana), failOnPageErrors(bia)];
  await expect(bia.getByText("Área de Ana")).toBeVisible();

  // Ana is on the left when Bia's area is on her right.
  const canvasBox = (await ana.locator(CANVAS).boundingBox())!;
  const biaArea = (await ana.getByText("Área de Bia").boundingBox())!;
  const anaLeft = biaArea.x > canvasBox.x + canvasBox.width / 2;
  // Zones are 350 px wide and the shared strip is 350–450 of 800.
  const ownZone = anaLeft ? 0.2 : 0.8;

  // Before anyone draws, Bia sees nothing from Ana.
  expect(await overlayInk(bia)).toBe(0);

  // Ana draws down the middle strip: it reaches Bia live, in the strip.
  await draw(ana, [
    [0.48, 0.2],
    [0.5, 0.5],
    [0.52, 0.8],
  ]);
  await expect
    .poll(() => overlayInk(bia), { timeout: 2_000 })
    .toBeGreaterThan(0);
  const inStrip = await overlayInk(bia);

  // Ana draws in her own zone: Bia still only has the strip.
  await draw(ana, [
    [ownZone - 0.1, 0.3],
    [ownZone, 0.6],
    [ownZone + 0.1, 0.3],
  ]);
  await bia.waitForTimeout(1_000);
  for (const [from, to] of await overlaySpans(bia)) {
    expect(from).toBeGreaterThanOrEqual(350 / 800 - 0.01);
    expect(to).toBeLessThanOrEqual(450 / 800 + 0.01);
  }
  expect(await overlayInk(bia)).toBe(inStrip);
  await expect(bia.getByText("Área de Ana")).toBeVisible();

  await table.close();
  expect(errors.flat()).toEqual([]);
});
