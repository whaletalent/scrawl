import { test, expect } from "@playwright/test";
import { autoplayParty, bot, createRoom, draw, failOnPageErrors } from "./helpers";

test("a full Party game: theme, drawing, voting, reveal, final results and share card", async ({ page }) => {
  const errors = failOnPageErrors(page);
  const code = await createRoom(page, { mode: "Party (4-10)", rounds: 1, turnSeconds: 30 });
  for (const name of ["Bia", "Caio", "Duda"]) autoplayParty(await bot(code, name));

  await page.getByRole("button", { name: "Começar jogo" }).click();

  await expect(page.getByRole("heading", { name: "Crie um tema" })).toBeVisible();
  await page.getByPlaceholder(/^ex\.:/).fill("Um pato de terno");
  await page.getByRole("button", { name: "Enviar", exact: true }).click();
  await expect(page.getByText("(1/2 enviados)")).toBeVisible();
  await expect(page.getByText("Um pato de terno")).toBeVisible();

  // 4 players: theme voting is skipped
  await expect(page.getByRole("heading", { name: /^Desenhe: / })).toBeVisible();
  await expect(page.getByText(/Você desenha a metade (esquerda|direita)/)).toBeVisible();
  const side = (await page.getByText(/Você desenha a metade/).innerText()).includes("esquerda") ? 0.25 : 0.75;
  await draw(page, [[side - 0.15, 0.2], [side, 0.7], [side + 0.15, 0.2]]);
  await page.getByRole("button", { name: "Enviar Desenho" }).click();
  await expect(page.getByText("Desenho enviado! Esperando os outros...")).toBeVisible();

  // the only votable drawing is the other pair's
  await expect(page.getByRole("heading", { name: "Vote nos melhores" })).toBeVisible();
  await expect(page.getByRole("button", { name: "1º" })).toHaveCount(1);
  await page.getByRole("button", { name: "1º" }).click();

  await expect(page.getByRole("heading", { name: "Revelação!" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Resultado final!" })).toBeVisible();
  for (const name of ["Ana", "Bia", "Caio", "Duda"]) await expect(page.getByText(name).first()).toBeVisible();

  // both pairs' drawings are listed with the real players' names
  await expect(page.getByText("Rodada 1")).toHaveCount(2);
  await expect(page.getByText(/^\S+ \+ \S+$/)).toHaveCount(2);
  await expect(page.getByText(/Ana \+ |\+ Ana/)).toHaveCount(1);
  await expect(page.getByText("Player A")).toHaveCount(0);

  // The bots gave our pair two 1st places (3 pts each, doubled in the final round).
  await expect(page.getByText("12 pts").first()).toBeVisible();

  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Baixar card" }).first().click();
  expect((await download).suggestedFilename()).toMatch(/^scrawl-\d+\.png$/);
  expect(errors).toEqual([]);
});

test("with an odd number of players, everyone takes a turn as the judge", async ({ page }) => {
  test.setTimeout(150_000);
  // 5 players and 5 rounds: the sit-out rotation guarantees our turn comes.
  const code = await createRoom(page, { mode: "Party (4-10)", rounds: 5, turnSeconds: 15 });
  for (const name of ["Bia", "Caio", "Duda", "Edu"]) autoplayParty(await bot(code, name));
  await page.getByRole("button", { name: "Começar jogo" }).click();

  await expect(page.getByRole("heading", { name: "Você é o jurado desta rodada" })).toBeVisible({ timeout: 100_000 });
  await expect(page.locator("canvas")).toHaveCount(0);

  // the judge isn't in any pair, so they can rank both drawings
  await expect(page.getByRole("heading", { name: "Vote nos melhores" })).toBeVisible();
  await expect(page.getByRole("button", { name: "1º" })).toHaveCount(2);
});
