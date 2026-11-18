import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { startServer } from "./server.js";
import { createRoom, type, phase, sleep, IMG } from "./client.js";

// Short grace so "left for good" happens fast; real-time phases so nothing
// advances on its own while a test is poking at a phase.
const GRACE = 100;
let srv: Awaited<ReturnType<typeof startServer>>;
before(async () => { srv = await startServer({ timeScale: 1, graceMs: GRACE }); });
after(() => srv.stop());

test("lobby: when the host leaves, a new host is announced and nothing else happens", async () => {
  const { clients } = await createRoom(srv.url, 3, { gameMode: "party" });
  const left = clients[1].wait(type("player-left"));
  clients[0].close();
  const msg = await left;
  assert.equal(msg.playerId, clients[0].playerId);
  assert.ok([clients[1].playerId, clients[2].playerId].includes(msg.hostId));
  await sleep(100);
  assert.ok(!clients[1].seen(type("notice")) && !clients[1].seen(type("phase-change")));
});

test("split-body: partner leaving ends the game with only the completed rounds", async () => {
  const { clients } = await createRoom(srv.url, 2, { gameMode: "split-body", totalRounds: 2, turnDuration: 60 });
  const [host, guest] = clients;

  const round2 = host.wait((m) => m.type === "split-round-start" && m.round === 2);
  const started = Promise.all([host.wait(phase("split-drawing")), guest.wait(phase("split-drawing"))]);
  host.send({ type: "start-game" });
  await started;
  host.send({ type: "submit-split-drawing", imageDataUrl: IMG });
  guest.send({ type: "submit-split-drawing", imageDataUrl: IMG });
  await round2;

  const notice = host.wait(type("notice"));
  const final = host.wait(type("split-final-results"));
  const finalPhase = host.wait(phase("split-final"));
  guest.close();

  assert.match((await notice).message, /parceiro saiu/);
  const { drawings } = await final;
  assert.deepEqual(drawings.map((d: { round: number }) => d.round), [1]);
  await finalPhase;
});

test("face-builder: partner leaving in round 1 ends the game with no drawings and promotes the guest", async () => {
  const { clients } = await createRoom(srv.url, 2, { gameMode: "face-builder", totalRounds: 2, turnDuration: 60 });
  const [host, guest] = clients;
  const started = guest.wait(phase("face-drawing"));
  host.send({ type: "start-game" });
  await started;

  const left = guest.wait(type("player-left"));
  const final = guest.wait(type("face-final-results"));
  host.close();

  assert.equal((await left).hostId, guest.playerId);
  assert.equal((await final).drawings.length, 0);
});

test("party: keeps going with 4 players, ends below 4", async () => {
  const { clients } = await createRoom(srv.url, 5, { gameMode: "party", totalRounds: 2 });
  const started = clients[1].wait(phase("theme-creation"));
  clients[0].send({ type: "start-game" });
  await started;

  const firstLeft = clients[1].wait(type("player-left"));
  clients[4].close();
  await firstLeft;
  await sleep(50);
  assert.ok(!clients[1].seen(type("notice")), "game must continue with 4 players");

  const notice = clients[1].wait(type("notice"));
  const final = clients[1].wait(type("final-results"));
  clients[3].close();
  assert.match((await notice).message, /insuficientes/);
  const result = await final;
  assert.equal(result.players.length, 3);
  assert.ok(Array.isArray(result.drawings));
});
