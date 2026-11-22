import { test, expect } from "@playwright/test";
import { canvasHasInk, createRoom, draw, failOnPageErrors } from "./helpers";

test("two browsers play Face Builder; a reload rejoins; a partner leaving ends the game", async ({
  page: host,
  browser,
}) => {
  const errors = failOnPageErrors(host);
  const code = await createRoom(host, {
    mode: "Caricatura a dois (2)",
    turnSeconds: 180,
  });

  const guest = await (await browser.newContext()).newPage();
  await guest.goto(`/room/?code=${code}`);
  await guest.getByPlaceholder("Seu apelido").fill("Bia");
  await guest.getByRole("button", { name: "Entrar" }).click();

  await host.getByRole("button", { name: "Começar Caricatura a dois" }).click();
  for (const p of [host, guest]) {
    await expect(
      p.getByRole("heading", { name: "Monte o rosto!" }),
    ).toBeVisible();
    await expect(p.getByText("Rodada 1 de 3").first()).toBeVisible();
  }

  // Each player gets 3 of the 6 regions, and together they cover the face.
  const regions = async (p: typeof host) =>
    p
      .getByRole("list", { name: "Suas partes do rosto" })
      .getByRole("listitem")
      .allInnerTexts();
  const all = [...(await regions(host)), ...(await regions(guest))].sort();
  expect(all).toEqual(
    ["Boca", "Cabelo", "Nariz", "Olhos", "Ombros", "Orelhas"].sort(),
  );

  // A stroke only takes when it starts inside one of the player's own regions,
  // so try a short one in each of the six (hair, eyes, ear, nose, mouth, shoulders).
  expect(await canvasHasInk(host)).toBe(false);
  for (const [x, y] of [
    [0.05, 0.07],
    [0.5, 0.4],
    [0.24, 0.43],
    [0.5, 0.55],
    [0.5, 0.71],
    [0.5, 0.92],
  ]) {
    await draw(host, [
      [x - 0.02, y],
      [x + 0.02, y],
    ]);
  }
  expect(await canvasHasInk(host)).toBe(true);
  await expect(host.getByTitle("Desfazer (Ctrl+Z)")).toBeEnabled();

  // Reloading mid-game puts the host straight back into the round.
  await host.reload();
  await expect(
    host.getByRole("heading", { name: "Monte o rosto!" }),
  ).toBeVisible();
  await expect(host).toHaveURL(`/room/?code=${code}`);
  await expect(guest.getByText(/saiu|encerrado/)).toHaveCount(0);
  await expect(guest.getByText(/aguardando reconexão/)).toHaveCount(0);

  // The guest leaves for good: banner first, then the game wraps up.
  await guest.close();
  await expect(
    host.getByText("Bia desconectou — aguardando reconexão..."),
  ).toBeVisible();
  await expect(
    host.getByText("Seu parceiro saiu. O jogo foi encerrado."),
  ).toBeVisible();
  await expect(host.getByText("Nenhum desenho para mostrar.")).toBeVisible();
  expect(errors).toEqual([]);
});

test("when time runs out every round keeps both parts, even with a guest whose clock is behind", async ({
  page: host,
  browser,
}) => {
  test.setTimeout(120_000);
  const code = await createRoom(host, {
    mode: "Caricatura a dois (2)",
    rounds: 3,
    turnSeconds: 15,
  });

  const guestContext = await browser.newContext();
  // The guest's device runs 3 seconds behind the server.
  await guestContext.addInitScript(() => {
    const realNow = Date.now.bind(Date);
    Date.now = () => realNow() - 3000;
  });
  const guest = await guestContext.newPage();
  await guest.goto(`/room/?code=${code}`);
  await guest.getByPlaceholder("Seu apelido").fill("Bia");
  await guest.getByPlaceholder("Seu apelido").press("Enter");
  await expect(host.getByText("Jogadores (2/2)")).toBeVisible();

  // What the server finally hands out, read off the host's socket.
  const finalDrawings = new Promise<
    {
      round: number;
      player1ImageDataUrl: string;
      player2ImageDataUrl: string;
    }[]
  >((resolve) =>
    host.on("websocket", (ws) =>
      ws.on("framereceived", ({ payload }) => {
        const m = JSON.parse(String(payload));
        if (m.type === "face-final-results") resolve(m.drawings);
      }),
    ),
  );
  await host.reload();
  await expect(host.getByText("Jogadores (2/2)")).toBeVisible();

  await host.getByRole("button", { name: "Começar Caricatura a dois" }).click();
  // Nobody presses "Enviar desenho": every turn ends on the timer.
  for (const p of [host, guest])
    await expect(
      p.getByRole("heading", { name: "Vocês montaram 3 caricaturas" }),
    ).toBeVisible({ timeout: 60_000 });

  const drawings = await finalDrawings;
  expect(drawings.map((d) => d.round)).toEqual([1, 2, 3]);
  for (const d of drawings) {
    expect(d.player1ImageDataUrl, `round ${d.round}`).toBeTruthy();
    expect(d.player2ImageDataUrl, `round ${d.round}`).toBeTruthy();
  }
});
