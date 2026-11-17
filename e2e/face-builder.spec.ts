import { test, expect } from "@playwright/test";
import { canvasHasInk, createRoom, draw, failOnPageErrors } from "./helpers";

test("two browsers play Face Builder; a reload rejoins; a partner leaving ends the game", async ({ page: host, browser }) => {
  const errors = failOnPageErrors(host);
  const code = await createRoom(host, { mode: "Face Builder (2)", turnSeconds: 180 });

  const guest = await (await browser.newContext()).newPage();
  await guest.goto(`/room/${code}`);
  await guest.getByPlaceholder("Seu apelido").fill("Bia");
  await guest.getByRole("button", { name: "Entrar" }).click();

  await host.getByRole("button", { name: "Começar Face Builder" }).click();
  for (const p of [host, guest]) {
    await expect(p.getByRole("heading", { name: "Monte o rosto!" })).toBeVisible();
    await expect(p.getByText("Rodada 1/3").first()).toBeVisible();
  }

  // Each player gets 3 of the 6 regions, and together they cover the face.
  const regions = async (p: typeof host) => p.locator("h2 + div > span").allInnerTexts();
  const all = [...(await regions(host)), ...(await regions(guest))].sort();
  expect(all).toEqual(["Boca", "Cabelo", "Nariz", "Olhos", "Ombros", "Orelhas"].sort());

  // A stroke only takes when it starts inside one of the player's own regions,
  // so try a short one in each of the six (hair, eyes, ear, nose, mouth, shoulders).
  expect(await canvasHasInk(host)).toBe(false);
  for (const [x, y] of [[0.05, 0.07], [0.5, 0.4], [0.24, 0.43], [0.5, 0.55], [0.5, 0.71], [0.5, 0.92]]) {
    await draw(host, [[x - 0.02, y], [x + 0.02, y]]);
  }
  expect(await canvasHasInk(host)).toBe(true);
  await expect(host.getByTitle("Desfazer (Ctrl+Z)")).toBeEnabled();

  // Reloading mid-game puts the host straight back into the round.
  await host.reload();
  await expect(host.getByRole("heading", { name: "Monte o rosto!" })).toBeVisible();
  await expect(host).toHaveURL(`/room/${code}`);
  await expect(guest.getByText(/saiu|encerrado/)).toHaveCount(0);
  await expect(guest.getByText(/aguardando reconexão/)).toHaveCount(0);

  // The guest leaves for good: banner first, then the game wraps up.
  await guest.close();
  await expect(host.getByText("Bia desconectou — aguardando reconexão...")).toBeVisible();
  await expect(host.getByText("Seu parceiro saiu. O jogo foi encerrado.")).toBeVisible();
  await expect(host.getByText("Nenhum desenho para mostrar.")).toBeVisible();
  expect(errors).toEqual([]);
});
