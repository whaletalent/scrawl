import { test, expect, type Browser, type Page } from "@playwright/test";
import {
  autoplayParty,
  bot,
  createRoom,
  draw,
  failOnPageErrors,
  IMG,
  signUp,
  uniqueName,
} from "./helpers";
import { type } from "../apps/ws-server/test/client";

/** A fresh browser, signed in as a brand-new account. */
async function player(browser: Browser, prefix: string) {
  const page = await (await browser.newContext()).newPage();
  const name = uniqueName(prefix);
  await signUp(page, name);
  return { page, name };
}

/** Plays a one-round Split Body game against a bot, up to the final screen. */
async function splitFinal(page: Page, loggedIn: boolean) {
  const code = await createRoom(page, {
    mode: "Split Body (2)",
    rounds: 1,
    turnSeconds: 180,
    loggedIn,
  });
  const partner = await bot(code, "Robô");
  await page.getByRole("button", { name: "Começar Split Body" }).click();
  await expect(page.getByText("SUA ÁREA")).toBeVisible();
  await draw(page, [
    [0.3, 0.1],
    [0.5, 0.4],
    [0.7, 0.1],
  ]);
  await page.getByRole("button", { name: "Enviar Desenho" }).click();
  partner.send({ type: "submit-split-drawing", imageDataUrl: IMG });
  await expect(page.getByRole("heading", { name: "Resultado!" })).toBeVisible();
  return { code, partner };
}

const saveButton = (page: Page) =>
  page.getByRole("button", { name: "Salvar na galeria" });

test("a logged-in player saves the finished drawing, and everyone in the room sees it saved", async ({
  browser,
}) => {
  const a = await player(browser, "Ana");
  const errors = failOnPageErrors(a.page);
  const { partner } = await splitFinal(a.page, true);

  const told = partner.wait(type("drawing-saved"));
  await saveButton(a.page).click();
  await expect(a.page.getByText("Salvo na galeria")).toBeVisible();
  await expect(saveButton(a.page)).toHaveCount(0);
  expect((await told).key).toBe("1");

  // Coming back to the room, it is still marked as saved.
  await a.page.reload();
  await expect(a.page.getByText("Salvo na galeria")).toBeVisible();
  expect(errors).toEqual([]);
});

test("a guest has no way to save to the gallery", async ({ page }) => {
  await splitFinal(page, false);
  await expect(page.getByAltText("Metade de cima")).toBeVisible();
  await expect(saveButton(page)).toHaveCount(0);
  await expect(page.getByText("Salvo na galeria")).toHaveCount(0);
});

test("a party final has one save button per drawing, and saving one leaves the other", async ({
  browser,
}) => {
  const a = await player(browser, "Ana");
  const code = await createRoom(a.page, {
    mode: "Party (4-10)",
    rounds: 1,
    turnSeconds: 15,
    loggedIn: true,
  });
  for (const name of ["Bia", "Caio", "Duda"])
    autoplayParty(await bot(code, name));
  await a.page.getByRole("button", { name: "Começar jogo" }).click();

  // The page just lets the timers run: its half is submitted automatically.
  await expect(
    a.page.getByRole("heading", { name: "Resultado final!" }),
  ).toBeVisible({ timeout: 60_000 });
  await expect(saveButton(a.page)).toHaveCount(2);
  await saveButton(a.page).first().click();
  await expect(a.page.getByText("Salvo na galeria")).toHaveCount(1);
  await expect(saveButton(a.page)).toHaveCount(1);
});

const drawingOf = (page: Page, ...authors: string[]) =>
  page.getByAltText(`Desenho de ${authors.join(" + ")}`);

test("a saved drawing shows on another player's home and on the gallery page, with its authors", async ({
  browser,
  page,
}) => {
  const a = await player(browser, "Ana");
  const b = await player(browser, "Bia");
  await splitFinal(a.page, true);
  await saveButton(a.page).click();
  await expect(a.page.getByText("Salvo na galeria")).toBeVisible();

  // On someone else's home, in the side column.
  await b.page.reload();
  await expect(drawingOf(b.page, a.name, "Robô")).toBeVisible();
  await b.page.getByRole("link", { name: "Ver todos" }).click();
  await expect(b.page).toHaveURL("/gallery/");
  await drawingOf(b.page, a.name, "Robô").click();

  const detail = b.page.getByRole("dialog");
  await expect(detail).toContainText(a.name);
  await expect(detail).toContainText("Robô");
  await expect(detail).toContainText("Split Body");
  // The account's avatar next to its name; the guest gets the placeholder.
  await expect(detail.getByAltText(`Avatar de ${a.name}`)).toBeVisible();
  await expect(detail.locator('[data-initial="R"]')).toBeVisible();
  await detail.getByRole("button", { name: "Fechar" }).click();
  await expect(detail).toHaveCount(0);

  // The gallery is public: no account needed to look.
  await page.goto("/gallery/");
  await expect(drawingOf(page, a.name, "Robô")).toBeVisible();
});

test("a co-author removes a drawing from their profile: it leaves the gallery, image included", async ({
  browser,
}) => {
  const a = await player(browser, "Ana");
  const b = await player(browser, "Bia");
  const c = await player(browser, "Caio");

  // A and B play one Split Body round together.
  const code = await createRoom(a.page, {
    mode: "Split Body (2)",
    rounds: 1,
    turnSeconds: 180,
    loggedIn: true,
  });
  await b.page.goto(`/room/?code=${code}`);
  await expect(b.page.getByText(`${b.name} (você)`)).toBeVisible();
  await a.page.getByRole("button", { name: "Começar Split Body" }).click();
  for (const [p, y] of [
    [a.page, 0.2],
    [b.page, 0.8],
  ] as const) {
    await expect(p.getByText("SUA ÁREA")).toBeVisible();
    await draw(p, [
      [0.3, y],
      [0.7, y],
    ]);
    await p.getByRole("button", { name: "Enviar Desenho" }).click();
  }
  await expect(
    a.page.getByRole("heading", { name: "Resultado!" }),
  ).toBeVisible();
  await saveButton(a.page).click();
  // B, who didn't press anything, sees it saved too.
  await expect(b.page.getByText("Salvo na galeria")).toBeVisible();

  // It is on both authors' profiles and not on a stranger's.
  await c.page.goto("/profile/");
  await expect(
    c.page.getByText("Você ainda não tem desenhos na galeria."),
  ).toBeVisible();
  await a.page.goto("/profile/");
  await expect(drawingOf(a.page, a.name, b.name)).toBeVisible();

  await b.page.goto("/profile/");
  const mine = drawingOf(b.page, a.name, b.name);
  await expect(mine).toBeVisible();
  const src = (await mine.getAttribute("src"))!;
  expect((await b.page.request.get(src)).status()).toBe(200);

  await b.page.getByRole("button", { name: "Remover da galeria" }).click();
  await b.page.getByRole("button", { name: "Sim, remover" }).click();
  await expect(mine).toHaveCount(0);
  await expect(
    b.page.getByText("Você ainda não tem desenhos na galeria."),
  ).toBeVisible();

  // Gone for everyone, and the image itself no longer exists.
  expect((await b.page.request.get(src)).status()).toBe(404);
  await c.page.goto("/gallery/");
  await expect(c.page.getByRole("heading", { name: "Galeria" })).toBeVisible();
  await expect(drawingOf(c.page, a.name, b.name)).toHaveCount(0);
  await a.page.reload();
  await expect(drawingOf(a.page, a.name, b.name)).toHaveCount(0);
});
