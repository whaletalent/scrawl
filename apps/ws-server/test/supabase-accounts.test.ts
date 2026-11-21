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
