import { test, expect } from "@playwright/test";
import {
  autoplaySeam,
  bot,
  createRoom,
  failOnPageErrors,
  signUp,
  uniqueName,
} from "./helpers";

test("Emenda: a trio plays a round to the final", async ({ page }) => {
  test.setTimeout(120_000);
  const errors = failOnPageErrors(page);
  const name = uniqueName("Ana");
  await signUp(page, name);

  // The signed-in home's "Criar sala" offers Emenda too.
  const code = await createRoom(page, {
    mode: "Emenda (2-10)",
    loggedIn: true,
    rounds: 1,
    turnSeconds: 15,
  });
  await expect(page.getByText("Modo Emenda")).toBeVisible();
  const bots = [await bot(code, "Bia"), await bot(code, "Caio")];
  for (const b of bots) autoplaySeam(b);
  await expect(page.getByText("Jogadores (3/10)")).toBeVisible();

  await page.getByRole("button", { name: "Começar Emenda" }).click();

  // Three players are one trio: whatever my place, the other two zones are
  // grey and carry their names.
  await expect(page.getByText(/^Área de /)).toHaveCount(2);
  await expect(page.getByText("Área de Bia")).toBeVisible();
  await expect(page.getByText("Área de Caio")).toBeVisible();
  await expect(page.getByText("Rodada 1 de 1")).toBeVisible();
  // One status badge per member of the group.
  for (const who of ["Você", "Bia", "Caio"])
    await expect(
      page.locator("footer li").filter({ hasText: who }),
    ).toHaveCount(1);

  // The turn ends by itself: the page sends its layer on time-up, and the
  // reveal shows the trio's picture with all three names.
  const reveal = page.getByRole("heading", { name: "Revelação!" });
  await expect(reveal).toBeVisible({ timeout: 15_000 });
  const card = page.getByRole("article");
  await expect(card).toHaveCount(1);
  for (const who of [name, "Bia", "Caio"])
    await expect(card.getByText(who, { exact: true })).toBeVisible();

  // Then the final, with every round's picture and a way to keep it.
  await expect(page.getByText("Fim de jogo")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("img", { name: /^Desenho de / })).toHaveCount(1);
  await expect(
    page.getByRole("button", { name: "Salvar na galeria" }),
  ).toHaveCount(1);
  await expect(
    page.getByRole("button", { name: "Jogar de novo" }),
  ).toBeVisible();

  for (const b of bots) b.close();
  expect(errors).toEqual([]);
});

test("the mode is offered at room creation", async ({ page }) => {
  const code = await createRoom(page, { mode: "Emenda (2-10)", rounds: 2 });
  await expect(page.getByText("Modo Emenda")).toBeVisible();
  // Two players are enough to start.
  await expect(page.getByText("Esperando jogadores (1/2)...")).toBeVisible();
  const b = await bot(code, "Bia");
  await expect(page.getByText("Jogadores (2/10)")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Começar Emenda" }),
  ).toBeEnabled();
  b.close();
});
