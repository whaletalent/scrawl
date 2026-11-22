import { test, expect, devices } from "@playwright/test";
import {
  bot,
  canvasHasInk,
  createRoom,
  draw,
  failOnPageErrors,
  IMG,
} from "./helpers";

test("a Split Body round: draw your half, submit, see the combined result", async ({
  page,
}) => {
  const errors = failOnPageErrors(page);
  const code = await createRoom(page, {
    mode: "Monstrinho (2)",
    rounds: 1,
    turnSeconds: 180,
  });
  const partner = await bot(code, "Robô");

  await page.getByRole("button", { name: "Começar Monstrinho" }).click();
  await expect(
    page.getByRole("heading", { name: "Complete o personagem!" }),
  ).toBeVisible();
  await expect(page.getByText("Rodada 1 de 1").first()).toBeVisible();
  // the host draws the top half in round 1
  await expect(page.getByText("cabeça e tronco")).toBeVisible();
  await expect(page.getByText("SUA ÁREA")).toBeVisible();
  await expect(page.getByText("Área do parceiro")).toBeVisible();

  // Drawing in the partner's half does nothing; drawing in ours leaves ink.
  await draw(page, [
    [0.2, 0.6],
    [0.8, 0.9],
  ]);
  expect(await canvasHasInk(page)).toBe(false);
  await draw(page, [
    [0.3, 0.1],
    [0.5, 0.4],
    [0.7, 0.1],
  ]);
  expect(await canvasHasInk(page)).toBe(true);

  await page.getByRole("button", { name: "Enviar Desenho" }).click();
  await expect(
    page.getByText("Desenho enviado! Esperando parceiro..."),
  ).toBeVisible();

  partner.send({ type: "submit-split-drawing", imageDataUrl: IMG });
  await expect(
    page.getByRole("heading", { name: /^Vocês montaram/ }),
  ).toBeVisible();
  await expect(page.getByText("Rodada 1 de 1")).toBeVisible();
  await expect(page.getByAltText("Metade de cima")).toBeVisible();
  await expect(page.getByAltText("Metade de baixo")).toBeVisible();
  expect(errors).toEqual([]);
});

test.describe("on a phone", () => {
  // everything from the device profile except the browser choice (we only run Chromium)
  const { viewport, userAgent, deviceScaleFactor, isMobile, hasTouch } =
    devices["Pixel 7"];
  test.use({ viewport, userAgent, deviceScaleFactor, isMobile, hasTouch });

  test("lobby and drawing screens fit the viewport without sideways scrolling", async ({
    page,
  }) => {
    const fits = () =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      );

    const code = await createRoom(page, {
      mode: "Monstrinho (2)",
      rounds: 1,
      turnSeconds: 180,
    });
    await bot(code, "Robô");
    await expect(page.getByText("Jogadores (2/2)")).toBeVisible();
    expect(await fits()).toBe(true);

    await page.getByRole("button", { name: "Começar Monstrinho" }).click();
    await expect(page.getByText("SUA ÁREA")).toBeVisible();
    expect(await fits()).toBe(true);

    // touch drawing works too
    const box = (await page
      .locator("canvas:not([data-desk-trail])")
      .boundingBox())!;
    await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height * 0.2);
    await expect(
      page.getByRole("button", { name: "Enviar Desenho" }),
    ).toBeInViewport();
  });
});

test("Jogar de novo takes both players back to the same room for another game", async ({
  page,
}) => {
  const errors = failOnPageErrors(page);
  const code = await createRoom(page, {
    mode: "Monstrinho (2)",
    rounds: 1,
    turnSeconds: 180,
  });
  const partner = await bot(code, "Robô");
  partner.on((m) => {
    if (m.type === "split-round-start")
      partner.send({ type: "submit-split-drawing", imageDataUrl: IMG });
  });

  await page.getByRole("button", { name: "Começar Monstrinho" }).click();
  await page.getByRole("button", { name: "Enviar Desenho" }).click();
  await expect(
    page.getByRole("heading", { name: "Vocês montaram 1 monstrinho" }),
  ).toBeVisible();

  const backInLobby = partner.wait(
    (m) => m.type === "room-state" && m.state.phase === "lobby",
  );
  await page.getByRole("button", { name: "Jogar de novo" }).click();
  await backInLobby;
  await expect(page.getByText(`Código da sala`)).toBeVisible();
  await expect(page.getByText(code, { exact: true })).toBeVisible();
  await expect(page.getByText("Jogadores (2/2)")).toBeVisible();

  // The second game starts from scratch: one round, nothing left from the first.
  await page.getByRole("button", { name: "Começar Monstrinho" }).click();
  await expect(page.getByText("SUA ÁREA")).toBeVisible();
  await page.getByRole("button", { name: "Enviar Desenho" }).click();
  await expect(
    page.getByRole("heading", { name: "Vocês montaram 1 monstrinho" }),
  ).toBeVisible();
  await expect(page.getByText("Rodada 1 de 1")).toHaveCount(1);
  expect(errors).toEqual([]);
});
