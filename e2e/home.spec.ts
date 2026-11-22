import { test, expect, type Browser, type Page } from "@playwright/test";
import {
  createRoom,
  failOnPageErrors,
  signUp,
  uniqueName,
  WS_URL,
} from "./helpers";

/** A fresh browser, signed in as a brand-new account, on the home. */
async function player(browser: Browser, prefix: string) {
  const page = await (await browser.newContext()).newPage();
  const name = uniqueName(prefix);
  await signUp(page, name);
  return { page, name };
}

const listHeading = (page: Page) => page.getByText(/esperando jogadores$/);

const rowOf = (page: Page, hostName: string) =>
  page.getByRole("listitem").filter({ hasText: `Sala de ${hostName}` });

test("a public room shows on another player's home and can be joined from there", async ({
  browser,
}) => {
  const a = await player(browser, "Ana");
  const b = await player(browser, "Bia");
  const errors = failOnPageErrors(b.page);

  await createRoom(a.page, {
    mode: "Racha-tema (4-10)",
    loggedIn: true,
    visibility: "Pública",
  });
  await expect(a.page.getByText("Sala pública")).toBeVisible();

  const row = rowOf(b.page, a.name);
  await expect(row).toBeVisible();
  await expect(row).toContainText("Racha-tema");
  await expect(row).toContainText("1/10");
  await expect(row.getByAltText(`Avatar de ${a.name}`)).toBeVisible();

  await row.getByRole("button", { name: "Entrar" }).click();
  await expect(b.page.getByText(`${b.name} (você)`)).toBeVisible();
  await expect(b.page.getByText(a.name, { exact: true })).toBeVisible();
  await expect(a.page.getByText(b.name, { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test("a private room is not listed", async ({ browser }) => {
  const a = await player(browser, "Ana");
  const b = await player(browser, "Bia");
  await createRoom(a.page, { mode: "Racha-tema (4-10)", loggedIn: true });
  await expect(a.page.getByText("Código da sala")).toBeVisible();
  await expect(a.page.getByText("Sala pública")).toHaveCount(0);

  await b.page.waitForTimeout(1000);
  await expect(rowOf(b.page, a.name)).toHaveCount(0);
});

test("a room that fills up leaves the list", async ({ browser }) => {
  const a = await player(browser, "Ana");
  const b = await player(browser, "Bia");
  const c = await player(browser, "Caio");
  await createRoom(a.page, {
    mode: "Monstrinho (2)",
    loggedIn: true,
    visibility: "Pública",
  });

  await expect(rowOf(c.page, a.name)).toContainText("1 de 2");
  await rowOf(b.page, a.name).getByRole("button", { name: "Entrar" }).click();
  await expect(b.page.getByText(`${b.name} (você)`)).toBeVisible();
  await expect(rowOf(c.page, a.name)).toHaveCount(0);
});

test("the list is empty-handed gracefully, and a room whose host left disappears", async ({
  browser,
}) => {
  const a = await player(browser, "Ana");
  const b = await player(browser, "Bia");
  await createRoom(a.page, {
    mode: "Racha-tema (4-10)",
    loggedIn: true,
    visibility: "Pública",
  });
  await expect(rowOf(b.page, a.name)).toBeVisible();

  await a.page.context().close();
  await expect(rowOf(b.page, a.name)).toHaveCount(0);

  // A room code that leads nowhere is an error with a way back, not a crash.
  await b.page.goto("/room/?code=ZZZZZ");
  await expect(b.page.getByText(/Sala não encontrada/)).toBeVisible();
  await b.page.getByRole("link", { name: "Voltar" }).click();
  // With its count: the home subscribed again after coming back from a room page.
  await expect(listHeading(b.page)).toBeVisible();
});

test("join by code from the home", async ({ page, browser }) => {
  const code = await createRoom(page, { mode: "Racha-tema (4-10)" });
  const b = await player(browser, "Bia");

  await b.page.getByRole("button", { name: "Entrar com código" }).click();
  await b.page.getByPlaceholder("Código da sala").fill("abc");
  await b.page.locator("form").getByRole("button", { name: "Entrar" }).click();
  await expect(
    b.page.getByText("Digite um código de sala válido"),
  ).toBeVisible();

  await b.page.getByPlaceholder("Código da sala").fill(code.toLowerCase());
  await b.page.locator("form").getByRole("button", { name: "Entrar" }).click();
  await expect(b.page.getByText(`${b.name} (você)`)).toBeVisible();
});

test("the home says so while the game server is unreachable, and recovers by itself", async ({
  browser,
}) => {
  const b = await player(browser, "Bia");
  let blocked = true;
  await b.page.routeWebSocket(`${WS_URL}/**`, (ws) => {
    if (blocked) void ws.close();
    else ws.connectToServer();
  });
  await b.page.routeWebSocket(WS_URL, (ws) => {
    if (blocked) void ws.close();
    else ws.connectToServer();
  });

  await b.page.reload();
  await expect(b.page.getByText("Acordando o servidor…")).toBeVisible();
  // The rest of the home is there meanwhile.
  await expect(
    b.page.getByRole("button", { name: "Criar sala" }),
  ).toBeVisible();

  blocked = false;
  // Other tests may have public rooms open, so don't expect an empty list:
  // the heading gains its count once the server has answered.
  await expect(listHeading(b.page)).toBeVisible({ timeout: 15_000 });
  await expect(b.page.getByText("Acordando o servidor…")).toHaveCount(0);
});

test("on a phone the home is one column with no sideways scroll", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  const name = uniqueName("Cel");
  await signUp(page, name);

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
  const list = (await page.getByText("Salas abertas").boundingBox())!;
  const drawings = (await page
    .getByText("Últimos desenhos", { exact: true })
    .boundingBox())!;
  expect(drawings.y).toBeGreaterThan(list.y);
});

test("a signed-out visitor still gets the landing page, with no room list", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByPlaceholder("Seu apelido")).toBeVisible();
  await expect(page.getByText("Salas abertas")).toHaveCount(0);
  await expect(page.getByText("Últimos desenhos", { exact: true })).toHaveCount(
    0,
  );
});

test("asking for a public room without a valid session says the room stayed private", async ({
  browser,
}) => {
  const a = await player(browser, "Ana");
  // The stored access token is no longer one the game server accepts.
  await a.page.evaluate(() => {
    const key = Object.keys(localStorage).find((k) =>
      /^sb-.*-auth-token$/.test(k),
    )!;
    const session = JSON.parse(localStorage.getItem(key)!);
    session.access_token = "not-a-token";
    localStorage.setItem(key, JSON.stringify(session));
  });
  await a.page.reload();

  await createRoom(a.page, {
    mode: "Racha-tema (4-10)",
    loggedIn: true,
    visibility: "Pública",
  });
  await expect(a.page.getByText("Código da sala")).toBeVisible();
  await expect(a.page.getByText(/a sala ficou privada/)).toBeVisible();
  await expect(a.page.getByText("Sala pública")).toHaveCount(0);
});

test("the choice of a public room is used once and not left behind", async ({
  browser,
}) => {
  const a = await player(browser, "Ana");
  await createRoom(a.page, {
    mode: "Racha-tema (4-10)",
    loggedIn: true,
    visibility: "Pública",
  });
  await expect(a.page.getByText("Sala pública")).toBeVisible();
  expect(
    await a.page.evaluate(() => sessionStorage.getItem("scrawl-visibility")),
  ).toBeNull();

  // Opening the "new room" address again by hand must not make another public room.
  await a.page.goto("/room/?code=new");
  await expect(a.page.getByText("Código da sala")).toBeVisible();
  await expect(a.page.getByText("Sala pública")).toHaveCount(0);
  await expect(a.page.getByText(/a sala ficou privada/)).toHaveCount(0);
});

test("creating a room while the game server is still waking up gets there without a reload", async ({
  page,
}) => {
  let blocked = true;
  await page.routeWebSocket(WS_URL, (ws) => {
    if (blocked) void ws.close();
    else ws.connectToServer();
  });
  await page.routeWebSocket(`${WS_URL}/**`, (ws) => {
    if (blocked) void ws.close();
    else ws.connectToServer();
  });

  await page.goto("/");
  await page.getByPlaceholder("Seu apelido").fill("Ana");
  await page.getByRole("button", { name: "Criar sala" }).click();
  await page.getByRole("button", { name: "Criar Racha-tema" }).click();
  await expect(page.getByText("Conectando...")).toBeVisible();

  await page.waitForTimeout(1500);
  blocked = false;
  await expect(page.getByText("Código da sala")).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByText("Ana (você)")).toBeVisible();
});
