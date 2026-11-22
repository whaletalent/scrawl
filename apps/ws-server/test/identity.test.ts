import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { startServer } from "./server.js";
import { connect, join, type, sleep, IMG, type TestClient } from "./client.js";
import type { Accounts } from "../src/accounts.js";

const AVATAR = "https://x/storage/v1/object/public/avatars/u-ana/1.png";

/** Stands in for Supabase: one known account, and a token that takes a while to verify. */
const fake: Accounts = {
  async profileFromToken(t) {
    if (t === "slow") await sleep(300);
    return t === "tok-ana" || t === "slow"
      ? { userId: "u-ana", username: "Ana_99", avatarUrl: AVATAR }
      : null;
  },
};

let srv: Awaited<ReturnType<typeof startServer>> | undefined;
afterEach(async () => {
  await srv?.stop();
  srv = undefined;
});

async function host(url: string, message: object): Promise<TestClient> {
  const c = await connect(url, "host");
  const created = c.wait(type("room-state"));
  c.send({ type: "create-room", ...message });
  await created;
  return c;
}

test("a valid token makes the player show up with the account's username and avatar", async () => {
  srv = await startServer({ accounts: fake });
  const ana = await host(srv.url, {
    nickname: "whatever",
    accessToken: "tok-ana",
  });
  assert.equal(ana.state.players[0].nickname, "Ana_99");
  assert.equal(ana.state.players[0].avatarUrl, AVATAR);

  const joined = ana.wait(type("player-joined"));
  const bia = await join(srv.url, ana.state.code, "Bia");
  assert.equal(bia.state.players[0].nickname, "Ana_99");
  assert.equal(bia.state.players[0].avatarUrl, AVATAR);
  // A guest has no avatar at all — not even a null one.
  assert.equal("avatarUrl" in (await joined).player, false);
});

test("an unknown token joins as a guest with the nickname sent", async () => {
  srv = await startServer({ accounts: fake });
  const ana = await host(srv.url, { nickname: "Ana" });
  const bia = await join(srv.url, ana.state.code, "Bia", "nope");
  const me = bia.state.players.find(
    (p: { id: string }) => p.id === bia.playerId,
  );
  assert.equal(me.nickname, "Bia");
  assert.equal("avatarUrl" in me, false);
});

test("userId and tokens are never sent", async () => {
  srv = await startServer({ accounts: fake });
  const ana = await host(srv.url, { nickname: "x", accessToken: "tok-ana" });
  const bia = await join(srv.url, ana.state.code, "Bia");
  await sleep(50);

  for (const c of [ana, bia]) {
    const everything = JSON.stringify(c.msgs);
    assert.equal(everything.includes('u-ana"'), false, "userId leaked");
    assert.equal(everything.includes("userId"), false, "userId key leaked");
    assert.equal(everything.includes("tok-ana"), false, "access token leaked");
  }
  // The session token goes to its owner only.
  assert.equal(JSON.stringify(bia.msgs).includes(ana.token), false);
  assert.ok(ana.token);
});

test("with accounts off a token is ignored", async () => {
  srv = await startServer({ accounts: null });
  const bia = await host(srv.url, { nickname: "Bia", accessToken: "tok-ana" });
  assert.equal(bia.state.players[0].nickname, "Bia");
  assert.equal("avatarUrl" in bia.state.players[0], false);
});

test("a second join while the token is being verified is ignored", async () => {
  srv = await startServer({ accounts: fake });
  const ana = await host(srv.url, { nickname: "Ana" });
  const c = await connect(srv.url, "slow");
  const message = {
    type: "join-room",
    roomCode: ana.state.code,
    nickname: "x",
    accessToken: "slow",
  };
  c.send(message);
  c.send(message);
  c.send({ type: "create-room", nickname: "x" });
  await sleep(500);

  const watcher = await join(srv.url, ana.state.code, "Watcher");
  assert.deepEqual(
    watcher.state.players.map((p: { nickname: string }) => p.nickname),
    ["Ana", "Ana_99", "Watcher"],
  );
  assert.equal(c.msgs.filter(type("room-state")).length, 1);
});

test("closing the socket while the token is being verified leaves no ghost", async () => {
  srv = await startServer({ accounts: fake });
  const ana = await host(srv.url, { nickname: "Ana" });
  const c = await connect(srv.url, "gone");
  c.send({
    type: "join-room",
    roomCode: ana.state.code,
    nickname: "x",
    accessToken: "slow",
  });
  c.close();
  await sleep(500);

  const watcher = await join(srv.url, ana.state.code, "Watcher");
  assert.deepEqual(
    watcher.state.players.map((p: { nickname: string }) => p.nickname),
    ["Ana", "Watcher"],
  );
  assert.equal(ana.seen(type("player-left")), false);
});

test("party results carry the authors' avatars", async () => {
  srv = await startServer({ accounts: fake, timeScale: 0.02 });
  const ana = await host(srv.url, {
    nickname: "x",
    accessToken: "tok-ana",
    gameMode: "party",
    totalRounds: 1,
    turnDuration: 15,
  });
  const clients = [ana];
  for (const name of ["Bia", "Caio", "Duda"])
    clients.push(await join(srv.url, ana.state.code, name));
  for (const c of clients)
    c.on((m) => {
      if (m.type === "phase-change" && m.phase === "theme-creation")
        c.send({ type: "submit-theme", text: `tema de ${c.name}` });
      if (m.type === "pair-assigned")
        c.send({ type: "submit-drawing", imageDataUrl: IMG });
    });
  const final = ana.wait(type("final-results"), 20_000);
  ana.send({ type: "start-game" });
  const { drawings } = await final;

  assert.equal(drawings.length, 2);
  for (const d of drawings) {
    assert.equal(d.playerAvatars.length, 2);
    d.playerNames.forEach((name: string, i: number) =>
      assert.equal(d.playerAvatars[i], name === "Ana_99" ? AVATAR : null),
    );
  }
  assert.ok(
    drawings.some((d: { playerNames: string[] }) =>
      d.playerNames.includes("Ana_99"),
    ),
  );
});

test("rejoin keeps the identity", async () => {
  srv = await startServer({ accounts: fake, graceMs: 2000 });
  const ana = await host(srv.url, { nickname: "x", accessToken: "tok-ana" });
  ana.close();
  await sleep(50);

  const back = await connect(srv.url, "back");
  const state = back.wait(type("room-state"));
  back.send({ type: "rejoin", roomCode: ana.state.code, token: ana.token });
  const me = (await state).state.players[0];
  assert.equal(me.nickname, "Ana_99");
  assert.equal(me.avatarUrl, AVATAR);
});

test("a socket that is already in a room can't enter again", async () => {
  srv = await startServer({ accounts: fake });
  const ana = await host(srv.url, { nickname: "Ana", gameMode: "split-body" });
  const c = await connect(srv.url, "twice");
  const message = {
    type: "join-room",
    roomCode: ana.state.code,
    nickname: "Bia",
  };
  const joined = c.wait(type("room-state"));
  c.send(message);
  await joined;
  c.send(message);
  c.send({ type: "create-room", nickname: "Bia" });
  await sleep(100);

  // One Bia, not a ghost second one; and no second room for this socket.
  assert.equal(c.msgs.filter(type("room-state")).length, 1);
  assert.equal(ana.msgs.filter(type("player-joined")).length, 1);
});
