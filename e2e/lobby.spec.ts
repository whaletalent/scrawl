import { test, expect } from "@playwright/test";
import { bot, createRoom, failOnPageErrors } from "./helpers";

test("landing page validates the nickname", async ({ page }) => {
  await page.goto("/");
  await page.getByPlaceholder("Seu apelido").fill("A");
  await page.getByRole("button", { name: "Criar sala" }).click();
  await page.getByRole("button", { name: "Criar Racha-tema" }).click();
  await expect(
    page.getByText("O apelido precisa ter pelo menos 2 caracteres"),
  ).toBeVisible();
  await expect(page).toHaveURL("/");
});

test("the host's URL and invite link point to the real room", async ({
  page,
  context,
}) => {
  const errors = failOnPageErrors(page);
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  const code = await createRoom(page, { mode: "Caricatura a dois (2)" });

  await expect(page.getByText("Código da sala")).toBeVisible();
  await expect(page.getByText(code, { exact: true })).toBeVisible();
  await expect(page.getByText("Modo Caricatura a dois")).toBeVisible();
  await expect(page.getByText("Moldura: Aleatório")).toBeVisible();
  await expect(page.getByText("Ana (você)")).toBeVisible();

  await page.getByRole("button", { name: "Copiar link de convite" }).click();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toBe(`http://localhost:3100/room/?code=${code}`);
  expect(errors).toEqual([]);
});

test("an invite link asks for a nickname, then joins the room", async ({
  page,
  browser,
}) => {
  const code = await createRoom(page, { mode: "Monstrinho (2)" });

  const guest = await (await browser.newContext()).newPage();
  await guest.goto(`/room/?code=${code.toLowerCase()}`);
  await expect(
    guest.getByRole("heading", { name: `Entrar na sala ${code}` }),
  ).toBeVisible();
  await guest.getByRole("button", { name: "Entrar" }).click();
  await expect(
    guest.getByText("O apelido precisa ter pelo menos 2 caracteres"),
  ).toBeVisible();

  await guest.getByPlaceholder("Seu apelido").fill("Bia");
  await guest.getByPlaceholder("Seu apelido").press("Enter");
  await expect(guest.getByText("Jogadores (2/2)")).toBeVisible();
  await expect(guest.getByText("Bia (você)")).toBeVisible();
  await expect(guest.getByText("Esperando o host começar...")).toBeVisible();

  await expect(page.getByText("Jogadores (2/2)")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Começar Monstrinho" }),
  ).toBeEnabled();
});

test("an invite link to a room that doesn't exist shows an error and a way back", async ({
  page,
}) => {
  await page.goto("/room/?code=ZZZZZ");
  await page.getByPlaceholder("Seu apelido").fill("Bia");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(
    page.getByText("Sala não encontrada, cheia ou já iniciada"),
  ).toBeVisible();
  await page.getByRole("link", { name: "Voltar" }).click();
  await expect(page).toHaveURL("/");
});

test("the lobby waits for enough players and shows who is the host", async ({
  page,
}) => {
  const code = await createRoom(page, { mode: "Racha-tema (4-10)" });
  await expect(
    page.getByRole("button", { name: "Esperando jogadores (1/4)..." }),
  ).toBeDisabled();
  for (const name of ["Bia", "Caio", "Duda"]) await bot(code, name);
  await expect(page.getByText("Jogadores (4/10)")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Começar jogo" }),
  ).toBeEnabled();
});

test("when the host leaves the lobby, the next player becomes host", async ({
  page,
  browser,
}) => {
  const code = await createRoom(page, { mode: "Racha-tema (4-10)" });
  const guest = await (await browser.newContext()).newPage();
  await guest.goto(`/room/?code=${code}`);
  await guest.getByPlaceholder("Seu apelido").fill("Bia");
  await guest.getByRole("button", { name: "Entrar" }).click();
  await expect(guest.getByText("Esperando o host começar...")).toBeVisible();

  await page.close();
  await expect(guest.getByText("Ana (reconectando...)")).toBeVisible();
  // once the grace period is over the slot is gone and Bia is promoted
  await expect(
    guest.getByRole("button", { name: "Esperando jogadores (1/4)..." }),
  ).toBeVisible();
  await expect(guest.getByText("Ana")).toHaveCount(0);
});

test("opening the same session in a second tab takes over and stops the first", async ({
  page,
  context,
}) => {
  const code = await createRoom(page, { mode: "Racha-tema (4-10)" });
  const session = await page.evaluate(() => ({ ...sessionStorage }));

  // What "duplicate tab" does: a new tab starting with a copy of sessionStorage.
  const second = await context.newPage();
  await second.addInitScript((items) => {
    for (const [key, value] of Object.entries(items))
      sessionStorage.setItem(key, value);
  }, session);
  await second.goto(`/room/?code=${code}`);

  await expect(second.getByText("Ana (você)")).toBeVisible();
  await expect(second.getByText("Jogadores (1/10)")).toBeVisible();
  await expect(
    page.getByText("Esta sala foi aberta em outra aba."),
  ).toBeVisible();
  // and it stays that way — the first tab must not grab the slot back
  await page.waitForTimeout(3000);
  await expect(second.getByText("Ana (você)")).toBeVisible();
  await expect(
    page.getByText("Esta sala foi aberta em outra aba."),
  ).toBeVisible();
});

test("opening the room page without a code goes back to the landing page", async ({
  page,
}) => {
  await page.goto("/room/");
  await expect(page).toHaveURL("/");
  await expect(page.getByPlaceholder("Seu apelido")).toBeVisible();
});
