import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { startFakeSupabase } from "./fake-supabase.js";
import { startServer } from "./server.js";
import { connect, type } from "./client.js";
import { createSupabaseAccounts } from "../src/supabase-accounts.js";

let fake: Awaited<ReturnType<typeof startFakeSupabase>>;
before(async () => {
  fake = await startFakeSupabase();
});
after(() => fake.stop());

const accounts = (timeoutMs?: number) =>
  createSupabaseAccounts({ url: fake.url, secretKey: "secret", timeoutMs });

test("a signed-up user with an avatar resolves to their profile", async () => {
  const { userId, accessToken } = await fake.addUser("Ana_99", "12345678");
  assert.deepEqual(await accounts().profileFromToken(accessToken), {
    userId,
    username: "Ana_99",
    avatarUrl: `${fake.url}/storage/v1/object/public/avatars/${userId}/1.png`,
  });
});

test("no profile row yet resolves null", async () => {
  const { accessToken } = await fake.addUser("Novo", "12345678", false);
  assert.equal(await accounts().profileFromToken(accessToken), null);
});

test("a token that is expired, forged, garbage or for another audience resolves null", async () => {
  const { userId } = await fake.addUser("Bia", "12345678");
  const a = accounts();
  for (const token of [
    await fake.signToken({ sub: userId }, { expiresIn: "-1m" }),
    await fake.signToken({ sub: userId }, { wrongKey: true }),
    await fake.signToken({ sub: userId, aud: "anon" }),
    await fake.signToken({ sub: userId, iss: "https://evil.example/auth/v1" }),
    "garbage",
    "",
  ])
    assert.equal(await a.profileFromToken(token), null);
  // Sanity: the same user with a good token does resolve.
  assert.ok(await a.profileFromToken(await fake.signToken({ sub: userId })));
});

test("a profile pointing at an outside or someone else's avatar resolves null", async () => {
  const caio = await fake.addUser("Caio", "12345678");
  const duda = await fake.addUser("Duda", "12345678");
  for (const avatar_url of [
    "https://evil.example/a.png",
    `${fake.url}/storage/v1/object/public/avatars/${duda.userId}/1.png`,
  ]) {
    fake.setProfile(caio.userId, { username: "Caio", avatar_url });
    assert.equal(await accounts().profileFromToken(caio.accessToken), null);
  }
});

test("a profile with a username that breaks the rules resolves null", async () => {
  const { userId, accessToken } = await fake.addUser("Edu", "12345678");
  fake.setProfile(userId, {
    username: "<b>x</b>",
    avatar_url: `${fake.url}/storage/v1/object/public/avatars/${userId}/1.png`,
  });
  assert.equal(await accounts().profileFromToken(accessToken), null);
});

test("a slow Supabase resolves null within the timeout", async () => {
  const { accessToken } = await fake.addUser("Fabi", "12345678");
  fake.delayRest(2000);
  try {
    const started = Date.now();
    assert.equal(await accounts(200).profileFromToken(accessToken), null);
    assert.ok(Date.now() - started < 600, "took too long");
  } finally {
    fake.delayRest(0);
  }
});

test("an unreachable Supabase resolves null", async () => {
  const { accessToken } = await fake.addUser("Gabi", "12345678");
  const down = createSupabaseAccounts({
    url: "http://127.0.0.1:1",
    secretKey: "secret",
    timeoutMs: 500,
  });
  assert.equal(await down.profileFromToken(accessToken), null);
});

test("end to end: a room created with a real token shows the account", async () => {
  const { accessToken } = await fake.addUser("Hugo", "12345678");
  const srv = await startServer({ accounts: accounts() });
  try {
    const c = await connect(srv.url, "hugo");
    const state = c.wait(type("room-state"));
    c.send({ type: "create-room", nickname: "x", accessToken });
    const me = (await state).state.players[0];
    assert.equal(me.nickname, "Hugo");
    assert.match(me.avatarUrl, /\/avatars\/.+\/1\.png$/);
  } finally {
    await srv.stop();
  }
});

test("failures say why in the log, without the token, and don't repeat themselves", async () => {
  const { userId, accessToken } = await fake.addUser("Iara", "12345678");
  const reasons: string[] = [];
  const log = (reason: string) => reasons.push(reason);

  // A token Supabase didn't sign: the classic sign of a wrong SUPABASE_URL or signing setup.
  const forged = await fake.signToken({ sub: userId }, { wrongKey: true });
  const a = createSupabaseAccounts({ url: fake.url, secretKey: "s", log });
  await a.profileFromToken(forged);
  await a.profileFromToken(forged);
  assert.equal(
    reasons.length,
    1,
    "the same reason is logged once, not per player",
  );
  assert.match(reasons[0], /signature/i);

  // Supabase unreachable.
  const down = createSupabaseAccounts({
    url: "http://127.0.0.1:1",
    secretKey: "s",
    timeoutMs: 300,
    log,
  });
  await down.profileFromToken(accessToken);
  assert.equal(reasons.length, 2);

  // A player with no profile yet is normal, not a problem.
  const novo = await fake.addUser("Joca", "12345678", false);
  await a.profileFromToken(novo.accessToken);
  assert.equal(reasons.length, 2);

  for (const reason of reasons) {
    assert.equal(reason.includes(forged), false);
    assert.equal(reason.includes(accessToken), false);
  }
});

// ---- gallery ----

const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);
const gallery = () =>
  createSupabaseAccounts({
    url: fake.url,
    secretKey: fake.secretKey,
    log: () => {},
  });
const entryBy = (savedBy: string, partner: string | null = null) => ({
  png: PNG,
  gameMode: "party" as const,
  theme: "um gato de terno",
  authorNames: ["Autor", "Parceiro"],
  authorIds: [savedBy, partner],
  savedBy,
});
const rows = async (query = "") =>
  (await (await fetch(`${fake.url}/rest/v1/drawings?${query}`)).json()) as {
    id: string;
    image_path: string;
    saved_by: string;
  }[];
const imageUrl = (path: string) =>
  `${fake.url}/storage/v1/object/public/gallery/${path}`;
const as = (accessToken: string) => ({
  Authorization: `Bearer ${accessToken}`,
  "content-type": "application/json",
});

test("a saved drawing is a public row plus a public image", async () => {
  const kai = await fake.addUser("Kai", "12345678");
  assert.equal(await gallery().saveDrawing!(entryBy(kai.userId)), "saved");

  const [row] = await rows(`saved_by=eq.${kai.userId}`);
  assert.deepEqual(
    { ...row, id: "", image_path: "", created_at: "" },
    {
      id: "",
      image_path: "",
      game_mode: "party",
      theme: "um gato de terno",
      author_names: ["Autor", "Parceiro"],
      author_ids: [kai.userId, null],
      saved_by: kai.userId,
      created_at: "",
    },
  );
  assert.match(row.image_path, /^[0-9a-f-]{36}\.png$/);
  const image = await fetch(imageUrl(row.image_path));
  assert.equal(image.headers.get("content-type"), "image/png");
  assert.ok(Buffer.from(await image.arrayBuffer()).equals(PNG));
});

test("the eleventh save of a day is refused", async () => {
  const lia = await fake.addUser("Lia", "12345678");
  const g = gallery();
  for (let i = 0; i < 10; i++)
    assert.equal(await g.saveDrawing!(entryBy(lia.userId)), "saved");
  assert.equal(await g.saveDrawing!(entryBy(lia.userId)), "limit");
  assert.equal((await rows(`saved_by=eq.${lia.userId}`)).length, 10);
  // Somebody else is not affected.
  const mel = await fake.addUser("Mel", "12345678");
  assert.equal(await g.saveDrawing!(entryBy(mel.userId)), "saved");
});

test("a save that fails half-way leaves no orphan image and no row", async () => {
  const noa = await fake.addUser("Noa", "12345678");
  const before = fake.galleryFileCount();
  fake.failNextDrawingInsert();
  assert.equal(await gallery().saveDrawing!(entryBy(noa.userId)), "failed");
  assert.equal(fake.galleryFileCount(), before);
  assert.equal((await rows(`saved_by=eq.${noa.userId}`)).length, 0);

  // A wrong secret key, or Supabase being down, is a plain failure too.
  const wrongKey = createSupabaseAccounts({
    url: fake.url,
    secretKey: "wrong",
    log: () => {},
  });
  assert.equal(await wrongKey.saveDrawing!(entryBy(noa.userId)), "failed");
  const down = createSupabaseAccounts({
    url: "http://127.0.0.1:1",
    secretKey: "s",
    log: () => {},
  });
  assert.equal(await down.saveDrawing!(entryBy(noa.userId)), "failed");
  assert.equal(fake.galleryFileCount(), before);
});

test("only an author or whoever saved it can remove a drawing, image included", async () => {
  const saver = await fake.addUser("Oto", "12345678");
  const author = await fake.addUser("Pia", "12345678");
  const stranger = await fake.addUser("Rui", "12345678");
  const g = gallery();
  const remove = async (
    token: string,
    row: { id: string; image_path: string },
  ) => {
    await fetch(`${fake.url}/storage/v1/object/gallery`, {
      method: "DELETE",
      headers: as(token),
      body: JSON.stringify({ prefixes: [row.image_path] }),
    });
    await fetch(`${fake.url}/rest/v1/drawings?id=eq.${row.id}`, {
      method: "DELETE",
      headers: as(token),
    });
  };
  const exists = async (row: { id: string; image_path: string }) => ({
    row: (await rows(`id=eq.${row.id}`)).length === 1,
    image: (await fetch(imageUrl(row.image_path))).status === 200,
  });

  for (const who of [author, saver]) {
    await g.saveDrawing!({
      ...entryBy(saver.userId),
      authorIds: [null, author.userId],
    });
    const row = (await rows(`saved_by=eq.${saver.userId}`)).at(-1)!;

    await remove(stranger.accessToken, row);
    assert.deepEqual(await exists(row), { row: true, image: true });
    await remove(who.accessToken, row);
    assert.deepEqual(await exists(row), { row: false, image: false });
  }

  // A browser can't add to the gallery, with or without an account.
  const insert = await fetch(`${fake.url}/rest/v1/drawings`, {
    method: "POST",
    headers: as(stranger.accessToken),
    body: JSON.stringify({ image_path: "x.png", saved_by: stranger.userId }),
  });
  assert.ok(insert.status >= 400);
  const upload = await fetch(`${fake.url}/storage/v1/object/gallery/x.png`, {
    method: "POST",
    headers: { ...as(stranger.accessToken), "content-type": "image/png" },
    body: PNG,
  });
  assert.ok(upload.status >= 400);
});

test("the daily limit holds when saves arrive all at once", async () => {
  const tom = await fake.addUser("Tom", "12345678");
  const g = gallery();
  const results = await Promise.all(
    Array.from({ length: 13 }, () => g.saveDrawing!(entryBy(tom.userId))),
  );
  assert.equal(results.filter((r) => r === "saved").length, 10);
  assert.equal(results.filter((r) => r === "limit").length, 3);
  assert.equal((await rows(`saved_by=eq.${tom.userId}`)).length, 10);
});

test("a save Supabase never answers leaves nothing behind, even if the row had been written", async () => {
  const uli = await fake.addUser("Uli", "12345678");
  const files = fake.galleryFileCount();
  const g = createSupabaseAccounts({
    url: fake.url,
    secretKey: fake.secretKey,
    saveTimeoutMs: 300,
    log: () => {},
  });

  // The insert commits, but its answer never arrives.
  fake.stallNextDrawingInsert();
  const started = Date.now();
  assert.equal(await g.saveDrawing!(entryBy(uli.userId)), "failed");
  assert.ok(Date.now() - started < 3000, "took too long to give up");
  assert.equal((await rows(`saved_by=eq.${uli.userId}`)).length, 0);
  assert.equal(fake.galleryFileCount(), files);

  // And it can simply be saved again.
  assert.equal(await g.saveDrawing!(entryBy(uli.userId)), "saved");
  assert.equal((await rows(`saved_by=eq.${uli.userId}`)).length, 1);
});
