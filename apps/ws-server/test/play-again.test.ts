import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { startServer } from "./server.js";
import { createRoom, type, phase, IMG, sleep, type Msg } from "./client.js";

let srv: Awaited<ReturnType<typeof startServer>>;
before(async () => {
  srv = await startServer({ timeScale: 0.02 });
});
after(() => srv.stop());

/** A two-player split-body room played to its final screen. */
async function splitFinal(rounds = 2) {
  const { code, clients } = await createRoom(srv.url, 2, {
    gameMode: "split-body",
    totalRounds: rounds,
    turnDuration: 60,
  });
  for (const c of clients)
    c.on((m) => {
      if (m.type === "split-round-start")
        c.send({ type: "submit-split-drawing", imageDataUrl: IMG });
    });
  const final = clients[0].wait(type("split-final-results"));
  clients[0].send({ type: "start-game" });
  await final;
  return { code, clients };
}

test("the host sends everyone back to the lobby of the same room, and the next game starts clean", async () => {
  const { code, clients } = await splitFinal(2);
  const [host, guest] = clients;

  const lobby = guest.wait(
    (m) => m.type === "room-state" && m.state.phase === "lobby",
  );
  const hostLobby = host.wait(phase("lobby"));
  host.send({ type: "play-again" });
  const { state } = await lobby;
  await hostLobby;

  assert.equal(state.code, code);
  assert.equal(state.round, 0);
  assert.equal(state.players.length, 2);
  assert.ok(state.players.every((p: Msg) => p.score === 0));
  assert.deepEqual(state.savedDrawings, []);

  // A second game has only its own rounds.
  const final = host.wait(type("split-final-results"));
  host.send({ type: "start-game" });
  assert.equal((await final).drawings.length, 2);
});

test("only the host can ask for another game", async () => {
  const { clients } = await splitFinal(1);
  const [host, guest] = clients;
  const refused = guest.wait(type("error"));
  guest.send({ type: "play-again" });
  assert.match((await refused).message, /host/);
  await sleep(50);
  assert.ok(!host.seen(phase("lobby")));
});

test("nobody can restart a game that is still running", async () => {
  const { clients } = await createRoom(srv.url, 2, {
    gameMode: "split-body",
    totalRounds: 3,
    turnDuration: 300,
  });
  const [host] = clients;
  const started = host.wait(type("split-round-start"));
  host.send({ type: "start-game" });
  await started;
  const refused = host.wait(type("error"));
  host.send({ type: "play-again" });
  await refused;
  assert.ok(!host.seen(phase("lobby")));
});

test("party: scores go back to zero and the round count starts over", async () => {
  const { clients } = await createRoom(srv.url, 4, {
    totalRounds: 1,
    turnDuration: 15,
  });
  const [host] = clients;
  for (const c of clients)
    c.on((m) => {
      if (m.type === "phase-change" && m.phase === "theme-creation")
        c.send({ type: "submit-theme", text: `tema ${c.name}` });
      if (m.type === "pair-assigned")
        c.send({ type: "submit-drawing", imageDataUrl: IMG });
    });
  const final = host.wait(type("final-results"));
  host.send({ type: "start-game" });
  await final;

  const lobby = host.wait(
    (m) => m.type === "room-state" && m.state.phase === "lobby",
  );
  host.send({ type: "play-again" });
  const { state } = await lobby;
  assert.equal(state.round, 0);
  assert.deepEqual(state.themes, []);
  assert.ok(state.players.every((p: Msg) => p.score === 0));

  const again = host.wait(phase("theme-creation"));
  host.send({ type: "start-game" });
  assert.equal((await again).round, 1);
});
