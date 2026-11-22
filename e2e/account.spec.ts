import { test, expect, type Page } from "@playwright/test";
import {
  bot,
  createRoom,
  draw,
  emailOf,
  expectHome,
  failOnPageErrors,
  finishOnboarding,
  PASSWORD,
  signIn,
  signUp,
  signUpWithEmail,
  uniqueName,
} from "./helpers";

const avatarOf = (page: Page, username: string) =>
  page.getByAltText(`Avatar de ${username}`).first();

/** Alpha of one pixel of the drawing canvas, in its 800×600 coordinates. */
const inkAt = (page: Page, x: number, y: number) =>
  page
    .locator("canvas:not([data-desk-trail])")
    .evaluate(
      (c: HTMLCanvasElement, [px, py]) =>
        c.getContext("2d")!.getImageData(px, py, 1, 1).data[3],
      [x, y],
    );

test("sign up with e-mail, pick a username, draw an avatar, land on the home as that user", async ({
  page,
}) => {
  const errors = failOnPageErrors(page);
  const name = uniqueName("Ana");
  await signUp(page, name);

  await expect(page.getByPlaceholder("Seu apelido")).toHaveCount(0);
  const avatar = avatarOf(page, name);
  await expect(avatar).toBeVisible();
  await expect
    .poll(() => avatar.evaluate((img: HTMLImageElement) => img.naturalWidth))
    .toBe(256);
  expect(errors).toEqual([]);
});

test("sign in with Google goes through onboarding the first time and straight home the second", async ({
  page,
}) => {
  const name = uniqueName("Gil");
  // The fake's stand-in for Google signs in whoever `login_hint` names.
  await page.route("**/auth/v1/authorize**", (route) => {
    const url = new URL(route.request().url());
    url.searchParams.set("login_hint", emailOf(name));
    return route.continue({ url: url.toString() });
  });

  await page.goto("/login/");
  await page.getByRole("button", { name: "Entrar com Google" }).click();
  await expect(page).toHaveURL("/welcome/");
  await finishOnboarding(page, name);

  // A Google-only account has no password to change.
  await page.goto("/profile/");
  await expect(page.getByText(emailOf(name))).toBeVisible();
  await expect(page.getByPlaceholder("Nova senha")).toHaveCount(0);

  await page.getByRole("button", { name: "Sair" }).click();
  await expect(page).toHaveURL("/login/");
  await page.getByRole("button", { name: "Entrar com Google" }).click();
  await expectHome(page, name);
});

test("the avatar canvas lets you draw across region borders", async ({
  page,
}) => {
  await signUpWithEmail(page, emailOf(uniqueName("Cau")));
  await page.getByPlaceholder("Username").fill(uniqueName("Cau"));
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page.getByText("Desenhe seu avatar")).toBeVisible();

  // One stroke down the left cheek: it starts in "eyes" territory and crosses
  // the cheek, which belongs to no Face Builder region at all.
  await draw(page, [
    [260 / 800, 220 / 600],
    [260 / 800, 460 / 600],
  ]);
  expect(await inkAt(page, 260, 240)).toBeGreaterThan(0);
  expect(await inkAt(page, 260, 330)).toBeGreaterThan(0);
  expect(await inkAt(page, 260, 440)).toBeGreaterThan(0);
  // No region overlay in free mode.
  for (const label of ["Olhos", "Nariz", "Boca", "Orelhas", "Ombros"])
    await expect(page.getByText(label, { exact: true })).toHaveCount(0);
});

test("e-mail, password and username rules are enforced", async ({ page }) => {
  const name = uniqueName("Rul");
  await page.goto("/login/");
  await page.getByRole("tab", { name: "Criar conta" }).click();
  const submit = page.getByRole("button", { name: "Criar conta", exact: true });
  const fill = async (email: string, password: string, again: string) => {
    await page.getByPlaceholder("E-mail").fill(email);
    await page.getByPlaceholder("Senha", { exact: true }).fill(password);
    await page.getByPlaceholder("Repita a senha").fill(again);
    await submit.click();
  };

  await fill("not-an-email", PASSWORD, PASSWORD);
  await expect(page.getByText("Digite um e-mail válido")).toBeVisible();
  await fill(emailOf(name), "1234567", "1234567");
  await expect(
    page.getByText("A senha precisa ter pelo menos 8 caracteres"),
  ).toBeVisible();
  await fill(emailOf(name), PASSWORD, "87654321");
  await expect(page.getByText("As senhas não são iguais")).toBeVisible();
  await expect(page).toHaveURL("/login/");

  // None of those created an account: the address is still free.
  await fill(emailOf(name), PASSWORD, PASSWORD);
  await expect(page).toHaveURL("/welcome/");

  for (const bad of ["ab", "ana maria", "aná"]) {
    await page.getByPlaceholder("Username").fill(bad);
    await page.getByRole("button", { name: "Continuar" }).click();
    await expect(page.locator("p.text-red-600")).toBeVisible();
    await expect(page.getByText("Escolha seu username")).toBeVisible();
  }
});

test("an e-mail that already has an account is refused", async ({
  page,
  browser,
}) => {
  const name = uniqueName("Dup");
  await signUp(page, name);

  const other = await (await browser.newContext()).newPage();
  await other.goto("/login/");
  await other.getByRole("tab", { name: "Criar conta" }).click();
  await other.getByPlaceholder("E-mail").fill(emailOf(name).toUpperCase());
  await other.getByPlaceholder("Senha", { exact: true }).fill(PASSWORD);
  await other.getByPlaceholder("Repita a senha").fill(PASSWORD);
  await other.getByRole("button", { name: "Criar conta", exact: true }).click();
  await expect(other.getByText("Esse e-mail já tem conta")).toBeVisible();
  await expect(other).toHaveURL("/login/");
});

test("a username that exists in another capitalisation is refused", async ({
  page,
  browser,
}) => {
  const name = uniqueName("Cap_");
  await signUp(page, name);

  const other = await (await browser.newContext()).newPage();
  await signUpWithEmail(other, emailOf(uniqueName("Oth")));
  await other.getByPlaceholder("Username").fill(name.toLowerCase());
  await expect(other.getByText("Esse username já existe")).toBeVisible();
  await other.getByRole("button", { name: "Continuar" }).click();
  await expect(other.getByText("Escolha seu username")).toBeVisible();
  await expect(other.getByText("Esse username já existe")).toBeVisible();
});

test("sign out and sign back in", async ({ page }) => {
  const name = uniqueName("Out");
  await signUp(page, name);
  const src = await avatarOf(page, name).getAttribute("src");

  await page.getByRole("button", { name: "Sair" }).click();
  await expect(page.getByPlaceholder("Seu apelido")).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Entrar / Criar conta" }),
  ).toBeVisible();

  await signIn(page, emailOf(name), "wrong-password");
  await expect(page.getByText("E-mail ou senha incorretos")).toBeVisible();
  await signIn(page, emailOf(name));
  await expect(page).toHaveURL("/");
  await expect(avatarOf(page, name)).toHaveAttribute("src", src!);
});

test("abandoned onboarding resumes", async ({ page }) => {
  const name = uniqueName("Abn");
  await signUpWithEmail(page, emailOf(name));

  for (const path of ["/", "/profile/", "/avatar/"]) {
    await page.goto(path);
    await expect(page).toHaveURL("/welcome/");
  }
  // Even a room link sends an unfinished account to onboarding.
  await page.goto("/room/?code=ABCDE");
  await expect(page).toHaveURL("/welcome/");

  await page.getByRole("button", { name: "Sair" }).click();
  await expect(page).toHaveURL("/login/");
  await signIn(page, emailOf(name));
  await expect(page).toHaveURL("/welcome/");
  await finishOnboarding(page, name);
});

test("redraw the avatar from the profile", async ({ page }) => {
  const name = uniqueName("Red");
  await signUp(page, name);
  await page.goto("/profile/");
  const before = await avatarOf(page, name).getAttribute("src");

  await page.getByRole("link", { name: "Redesenhar avatar" }).click();
  await expect(page).toHaveURL("/avatar/");
  await page.getByRole("button", { name: "Monstro" }).click();
  await draw(page, [
    [0.3, 0.6],
    [0.7, 0.6],
  ]);
  await page.getByRole("button", { name: "Salvar avatar" }).click();

  await expect(page).toHaveURL("/profile/");
  await expect(avatarOf(page, name)).not.toHaveAttribute("src", before!);
});

test("change the password from the profile", async ({ page }) => {
  const name = uniqueName("Pwd");
  await signUp(page, name);
  await page.goto("/profile/");
  await page
    .getByPlaceholder("Nova senha", { exact: true })
    .fill("new-password-1");
  await page.getByPlaceholder("Repita a nova senha").fill("new-password-1");
  await page.getByRole("button", { name: "Trocar senha" }).click();
  await expect(page.getByText("Senha trocada")).toBeVisible();

  await page.getByRole("button", { name: "Sair" }).click();
  await signIn(page, emailOf(name));
  await expect(page.getByText("E-mail ou senha incorretos")).toBeVisible();
  await signIn(page, emailOf(name), "new-password-1");
  await expect(page).toHaveURL("/");
});

test("a logged-in player hosts a room; a guest sees their username and avatar but never their e-mail", async ({
  page,
}) => {
  const errors = failOnPageErrors(page);
  const name = uniqueName("Host");
  await signUp(page, name);
  const code = await createRoom(page, {
    mode: "Racha-tema (4-10)",
    loggedIn: true,
  });

  const guest = await bot(code, "Bia");
  const host = guest.state.players[0];
  expect(host.nickname).toBe(name);
  expect(host.avatarUrl).toMatch(/\/avatars\/[^/]+\/\d+\.png$/);

  // The lobby shows the real avatar for the account and a placeholder for the guest.
  await expect(page.getByText(`${name} (você)`)).toBeVisible();
  await expect(avatarOf(page, name)).toBeVisible();
  await expect(page.getByText("Bia")).toBeVisible();
  await expect(page.locator('[data-initial="B"]')).toBeVisible();

  const everything = JSON.stringify(guest.msgs).toLowerCase();
  expect(everything).not.toContain(emailOf(name));
  expect(everything).not.toContain("@test.example");
  expect(everything).not.toContain("userid");
  expect(errors).toEqual([]);
});

test("a logged-in player opening an invite link skips the nickname prompt", async ({
  page,
  browser,
}) => {
  const code = await createRoom(page, { mode: "Racha-tema (4-10)" });

  const other = await (await browser.newContext()).newPage();
  const name = uniqueName("Inv");
  await signUp(other, name);
  await other.goto(`/room/?code=${code}`);
  await expect(other.getByText(`${name} (você)`)).toBeVisible();
  await expect(other.getByPlaceholder("Seu apelido")).toHaveCount(0);
  // The host (a guest) sees the newcomer with their avatar.
  await expect(avatarOf(page, name)).toBeVisible();
});

test("a guest opening an invite link is still asked for a nickname", async ({
  page,
  browser,
}) => {
  const code = await createRoom(page, { mode: "Racha-tema (4-10)" });
  const other = await (await browser.newContext()).newPage();
  await other.goto(`/room/?code=${code}`);
  await other.getByPlaceholder("Seu apelido").fill("Caio");
  await other.getByRole("button", { name: "Entrar" }).click();
  await expect(other.getByText("Caio (você)")).toBeVisible();
});

test("when Supabase stops answering, a logged-in player can still play as a guest within seconds", async ({
  page,
}) => {
  const name = uniqueName("Hang");
  await signUp(page, name);
  const code = await createRoom(page, {
    mode: "Racha-tema (4-10)",
    loggedIn: true,
  });
  // Someone else in the room, so it outlives this page navigating away.
  await bot(code, "Bia");

  // Supabase accepts connections and never answers.
  await page.route("http://localhost:8090/**", () => {});

  // The profile read hangs: the landing must not sit on "Carregando...".
  await page.goto("/");
  await expect(page.getByPlaceholder("Seu apelido")).toBeVisible({
    timeout: 6000,
  });

  // Worse: the stored session has expired too, so even reading it needs Supabase.
  await page.evaluate(() => {
    const key = Object.keys(localStorage).find((k) =>
      /^sb-.*-auth-token$/.test(k),
    )!;
    const session = JSON.parse(localStorage.getItem(key)!);
    session.expires_at = 1;
    localStorage.setItem(key, JSON.stringify(session));
  });
  // They get into the room anyway, as a guest under the name they had.
  await page.goto(`/room/?code=${code}`);
  await expect(page.getByText(`${name} (você)`)).toBeVisible({
    timeout: 8000,
  });
  await expect(page.getByAltText(`Avatar de ${name}`)).toHaveCount(0);
});

test("without Google turned on in the project there is no Google button, only e-mail", async ({
  page,
}) => {
  await page.route("**/auth/v1/settings", (route) =>
    route.fulfill({ json: { external: { email: true, google: false } } }),
  );
  await page.goto("/login/");
  await expect(page.getByPlaceholder("E-mail")).toBeVisible();
  await expect(page.getByRole("button", { name: /Google/ })).toHaveCount(0);
  await expect(page.getByText("ou com e-mail")).toHaveCount(0);
  await page.getByRole("tab", { name: "Criar conta" }).click();
  await expect(page.getByRole("button", { name: /Google/ })).toHaveCount(0);
});

test("creating an account offers Google too", async ({ page }) => {
  await page.goto("/login/");
  await page.getByRole("tab", { name: "Criar conta" }).click();
  await expect(
    page.getByRole("button", { name: "Criar conta com Google" }),
  ).toBeVisible();
});
