import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { startServer } from "./server.js";
import { config } from "../src/config.js";
import { connect, createRoom, type, phase, sleep, IMG, type TestClient } from "./client.js";

const GRACE = 400;
let srv: Awaited<ReturnType<typeof startServer>>;
before(async () => { srv = await startServer({ timeScale: 1, graceMs: GRACE }); });
after(() => srv.stop());

async function rejoin(code: string, token: string, name = "back"): Promise<TestClient> {
  const c = await connect(srv.url, name);
  const answered = c.wait((m) => m.type === "room-state" || m.type === "rejoin-failed");
  c.send({ type: "rejoin", roomCode: code, token });
  await answered;
  return c;
}

async function startedSplitGame() {
  const { code, clients } = await createRoom(srv.url, 2, { gameMode: "split-body", totalRounds: 2, turnDuration: 60 });
  const [host, guest] = clients;
  const roundStart = guest.wait(type("split-round-start"));
  host.send({ type: "start-game" });
  const guestSide: string = (await roundStart).side;
  return { code, host, guest, guestSide };
}

test("a dropped player is announced, keeps the slot and resumes where they were", async () => {
  const { code, host, guest, guestSide } = await startedSplitGame();
  guest.send({ type: "submit-split-drawing", imageDataUrl: IMG });
  await sleep(30);

  const offline = host.wait((m) => m.type === "player-connection" && m.connected === false);
  guest.close();
  assert.equal((await offline).playerId, guest.playerId);

  const online = host.wait((m) => m.type === "player-connection" && m.connected === true);
  const back = await connect(srv.url, "back");
  const state = back.wait(type("room-state"));
  const resync = back.wait(type("split-round-start"));
  back.send({ type: "rejoin", roomCode: code.toLowerCase(), token: guest.token });

  const roomState = await state;
  assert.equal(roomState.playerId, guest.playerId);
  assert.equal(roomState.state.phase, "split-drawing");
  const round = await resync;
  assert.equal(round.side, guestSide);
  assert.equal(round.round, 1);
  assert.equal(round.submitted, true, "server already had this player's drawing");
  assert.equal((await online).playerId, guest.playerId);

  await sleep(GRACE + 150); // well past the grace period
  assert.ok(!host.seen(type("player-left")) && !host.seen(type("notice")), "slot must survive the old grace timer");

  // and the game simply goes on
  const round2 = back.wait((m) => m.type === "split-round-start" && m.round === 2);
  host.send({ type: "submit-split-drawing", imageDataUrl: IMG });
  assert.equal((await round2).submitted, false);
});

test("rejoin is refused with a wrong token or after the grace period", async () => {
  const { code, host, guest } = await startedSplitGame();

  const wrong = await rejoin(code, "not-a-token");
  assert.equal(wrong.msgs.at(-1).type, "rejoin-failed");

  const left = host.wait(type("player-left"));
  const notice = host.wait(type("notice"));
  guest.close();
  await left;
  await notice;

  const late = await rejoin(code, guest.token);
  assert.equal(late.msgs.at(-1).type, "rejoin-failed");
});

test("the same token on a second socket takes over and tells the first to stand down", async () => {
  const { code, host, guest } = await startedSplitGame();

  const replaced = guest.wait(type("session-replaced"));
  const second = await rejoin(code, guest.token, "second-tab");
  assert.equal(second.playerId, guest.playerId);
  await replaced;

  await sleep(GRACE + 150);
  assert.ok(!host.seen(type("player-left")), "the takeover must not count as leaving");
});

test("party: rejoin resyncs the pair while drawing and the drawings while voting", async () => {
  config.timeScale = 0.1; // theme-creation 3s, drawing 3s, voting 2s
  try {
    const { code, clients } = await createRoom(srv.url, 4, { gameMode: "party", totalRounds: 1, turnDuration: 30 });
    const player = clients[3];
    const pairAssigned = player.wait(type("pair-assigned"), 10_000);
    const drawing = player.wait(phase("drawing"), 10_000);
    clients[0].send({ type: "start-game" });
    clients[0].send({ type: "submit-theme", text: "tema" });
    const pair = await pairAssigned;
    await drawing;
    assert.equal(pair.submitted, false);

    player.send({ type: "submit-drawing", imageDataUrl: IMG });
    await sleep(30);
    player.close();

    const back = await connect(srv.url, "back");
    const resync = back.wait(type("pair-assigned"));
    back.send({ type: "rejoin", roomCode: code, token: player.token });
    const again = await resync;
    assert.equal(again.pairId, pair.pairId);
    assert.equal(again.side, pair.side);
    assert.equal(again.theme, "tema");
    assert.equal(again.submitted, true);

    await back.wait(phase("drawing-voting"), 10_000);
    back.close();
    const back2 = await connect(srv.url, "back2");
    const drawings = back2.wait(type("drawings-ready"));
    back2.send({ type: "rejoin", roomCode: code, token: player.token });
    assert.equal((await drawings).drawings.length, 2);
  } finally {
    config.timeScale = 1;
  }
});
