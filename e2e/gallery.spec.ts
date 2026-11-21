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
