import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { startServer } from "./server.js";
import { connect, createRoom, join, type } from "./client.js";

let srv: Awaited<ReturnType<typeof startServer>>;
before(async () => {
  srv = await startServer();
});
after(() => srv.stop());

test("create-room sanitizes everything the client sends", async () => {
  const { clients } = await createRoom(srv.url, 1, {
    gameMode: "bogus",
    totalRounds: 99,
    turnDuration: 1,
    faceTemplate: "nope",
    skinTone: "red",
  });
  const s = clients[0].state;
  assert.equal(s.gameMode, "party");
  assert.equal(s.totalRounds, 5);
  assert.equal(s.turnDuration, 15);
  assert.equal(s.faceTemplate, "random");
  assert.equal(s.skinTone, "#FDDCB5");
});

test("rounds are clamped to 1–5 in every mode", async () => {
  for (const gameMode of ["party", "split-body", "face-builder"]) {
    const high = await createRoom(srv.url, 1, { gameMode, totalRounds: 9 });
    assert.equal(high.clients[0].state.totalRounds, 5, gameMode);
    const low = await createRoom(srv.url, 1, { gameMode, totalRounds: 0 });
    assert.equal(low.clients[0].state.totalRounds, 1, gameMode);
  }
});

test("nicknames are trimmed, capped at 16 chars and never empty", async () => {
  const host = await connect(srv.url);
  const created = host.wait(type("room-state"));
  host.send({ type: "create-room", nickname: "   " });
  const code = (await created).state.code;
  assert.equal(host.state.players[0].nickname, "Player");

  const guest = await join(srv.url, code, "  a-very-long-nickname-indeed  ");
  assert.equal(guest.state.players[1].nickname, "a-very-long-nick");
});

test("joining accepts a lowercase room code", async () => {
  const { code, clients } = await createRoom(srv.url, 1);
  const announced = clients[0].wait(type("player-joined"));
  const guest = await join(srv.url, code.toLowerCase(), "guest");
  assert.equal(guest.state?.code, code);
  assert.equal((await announced).player.nickname, "guest");
});

test("joining an unknown room is an error", async () => {
  const c = await join(srv.url, "ZZZZZ", "nobody");
  assert.equal(c.msgs.at(-1).type, "error");
});

test("2-player modes reject a third player", async () => {
  for (const gameMode of ["split-body", "face-builder"]) {
    const { code } = await createRoom(srv.url, 2, { gameMode });
    const third = await join(srv.url, code, "third");
    assert.equal(third.msgs.at(-1).type, "error", gameMode);
  }
});

test("a room that already started cannot be joined", async () => {
  const { code, clients } = await createRoom(srv.url, 2, {
    gameMode: "split-body",
  });
  const started = clients[1].wait(type("phase-change"));
  clients[0].send({ type: "start-game" });
  await started;
  const late = await join(srv.url, code, "late");
  assert.equal(late.msgs.at(-1).type, "error");
});

test("only the host can start, and only with enough players", async () => {
  const { clients } = await createRoom(srv.url, 3, { gameMode: "party" });
  const notHost = clients[1].wait(type("error"));
  clients[1].send({ type: "start-game" });
  assert.match((await notHost).message, /host/);

  const tooFew = clients[0].wait(type("error"));
  clients[0].send({ type: "start-game" });
  assert.match((await tooFew).message, /4 jogadores/);
});

test("players are serialized without their session token", async () => {
  const { clients } = await createRoom(srv.url, 2);
  const [host, guest] = clients;
  assert.ok(host.token && guest.token && host.token !== guest.token);
  const everything = JSON.stringify(
    [...host.msgs, ...guest.msgs].map((m) => ({
      ...m,
      sessionToken: undefined,
    })),
  );
  assert.ok(
    !everything.includes(host.token) && !everything.includes(guest.token),
  );
  assert.equal(guest.state.players[0].connected, true);
});
