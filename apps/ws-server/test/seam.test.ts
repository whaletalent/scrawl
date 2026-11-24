import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { startServer } from "./server.js";
import {
  connect,
  createRoom,
  join,
  type,
  phase,
  sleep,
  IMG,
  type Msg,
  type TestClient,
} from "./client.js";
import { groupPlayers } from "../src/game-engine.js";
import { config } from "../src/config.js";

/**
 * Emenda (`seam`): 2–10 players are regrouped every round into pairs (plus a
 * trio when the count is odd). Each one draws a layer; every round ends in a
 * reveal of all groups, and the game in a final screen with every round.
 */
let srv: Awaited<ReturnType<typeof startServer>>;
before(async () => {
  srv = await startServer({ timeScale: 0.02, submitGraceMs: 50, graceMs: 50 });
});
after(() => srv.stop());

const seamRoom = (n: number, totalRounds = 1, turnDuration = 15) =>
  createRoom(srv.url, n, { gameMode: "seam", totalRounds, turnDuration });

/** A player who sends their layer only when the server says time is up. */
function sendsOnTimeUp(c: TestClient) {
  let round = 0;
  c.on((m) => {
    if (m.type === "seam-round-start") round = m.round;
    if (m.type === "time-up")
      c.send({ type: "submit-seam-drawing", imageDataUrl: IMG, round });
  });
}

/** A player who sends their layer as soon as a round starts. */
function sendsAtOnce(c: TestClient) {
  c.on((m) => {
    if (m.type === "seam-round-start")
      c.send({
        type: "submit-seam-drawing",
        imageDataUrl: IMG,
        round: m.round,
      });
  });
}

test("groupPlayers: pairs, and one trio when the count is odd", () => {
  const ids = (n: number) => Array.from({ length: n }, (_, i) => `p${i}`);
  assert.deepEqual(groupPlayers(ids(2)), [["p0", "p1"]]);
  assert.deepEqual(groupPlayers(ids(3)), [["p0", "p1", "p2"]]);
  assert.deepEqual(groupPlayers(ids(4)), [
    ["p0", "p1"],
    ["p2", "p3"],
  ]);
  assert.deepEqual(groupPlayers(ids(7)), [
    ["p0", "p1"],
    ["p2", "p3"],
    ["p4", "p5", "p6"],
  ]);
  for (let n = 2; n <= 10; n++) {
    const groups = groupPlayers(ids(n));
    assert.deepEqual(groups.flat(), ids(n), `n=${n} keeps every id in order`);
    assert.ok(groups.every((g) => g.length === 2 || g.length === 3));
    assert.equal(groups.filter((g) => g.length === 3).length, n % 2);
  }
});

test("groups: every player gets one seam-round-start, in pairs plus one trio when odd", async () => {
  for (let n = 2; n <= 10; n++) {
    const { clients } = await seamRoom(n, 1, 300);
    const starts = clients.map((c) => c.wait(type("seam-round-start")));
    clients[0].send({ type: "start-game" });
    const msgs = await Promise.all(starts);
    await sleep(30);
    for (const c of clients)
      assert.equal(
        c.msgs.filter(type("seam-round-start")).length,
        1,
        `n=${n}: ${c.name} got one start`,
      );

    const groups = new Map<string, Msg>();
    msgs.forEach((m, i) => {
      assert.equal(m.round, 1);
      assert.equal(m.totalRounds, 1);
      assert.equal(m.submitted, false);
      assert.deepEqual(m.partnerSubmitted, []);
      assert.deepEqual(m.frames, []);
      assert.equal(m.members[m.index].id, clients[i].playerId, `n=${n}`);
      assert.equal(m.members[m.index].nickname, clients[i].name);
      groups.set(m.groupId, m.members);
    });
    const sizes = [...groups.values()].map((g) => g.length);
    assert.equal(
      sizes.reduce((a, b) => a + b, 0),
      n,
    );
    assert.equal(sizes.filter((s) => s === 3).length, n % 2, `n=${n}`);
    assert.ok(
      sizes.every((s) => s === 2 || s === 3),
      `n=${n}: ${sizes}`,
    );
    for (const c of clients) c.close();
  }
});

test("regroups each round", async () => {
  const { clients } = await seamRoom(4, 3, 15);
  for (const c of clients) sendsAtOnce(c);
  const ids: string[][] = [];
  clients[0].on((m) => {
    if (m.type === "seam-round-start")
      (ids[m.round - 1] ??= []).push(m.groupId);
  });
  const final = clients[0].wait(type("seam-final-results"), 10_000);
  clients[0].send({ type: "start-game" });
  await final;
  assert.equal(ids.length, 3);
  const all = clients.flatMap((c) =>
    c.msgs.filter(type("seam-round-start")).map((m: Msg) => m.groupId),
  );
  // 3 rounds of 2 groups, every one new.
  assert.equal(new Set(all).size, 6);
});

test("drawings from time-up make it into every round", async () => {
  const { clients } = await seamRoom(5, 2, 15);
  for (const c of clients) sendsOnTimeUp(c);
  const results: Msg[] = [];
  clients[0].on((m) => {
    if (m.type === "seam-round-results") results.push(m);
  });
  const reveal = clients[0].wait(phase("seam-reveal"), 10_000);
  const final = clients[0].wait(type("seam-final-results"), 10_000);
  const finalPhase = clients[0].wait(phase("seam-final"), 10_000);
  clients[0].send({ type: "start-game" });
  await reveal;
  const { drawings } = await final;

  assert.deepEqual(
    results.map((r) => r.round),
    [1, 2],
  );
  for (const r of results) {
    // 5 players: one pair and one trio.
    assert.deepEqual(
      r.drawings.map((d: Msg) => d.layers.length).sort(),
      [2, 3],
    );
    for (const d of r.drawings as Msg[]) {
      assert.equal(d.round, r.round);
      assert.ok(d.layers.every(Boolean), `round ${d.round}: a layer missing`);
      assert.equal(d.memberIds.length, d.layers.length);
      assert.equal(d.memberNames.length, d.layers.length);
      assert.equal(d.memberAvatars.length, d.layers.length);
      assert.deepEqual(d.stripFrames, []);
    }
  }
  assert.equal(drawings.length, 4);
  assert.deepEqual([...new Set(drawings.map((d: Msg) => d.round))], [1, 2]);
  await finalPhase;
});

test("round ends early when everyone submitted", async () => {
  const { clients } = await seamRoom(3, 2, 300);
  for (const c of clients) sendsAtOnce(c);
  const started = Date.now();
  const reveal = clients[0].wait(phase("seam-reveal"), 2_000);
  clients[0].send({ type: "start-game" });
  await reveal;
  // The turn is 6s at this time scale; nobody waited for it.
  assert.ok(Date.now() - started < 2_000);
  assert.ok(!clients[0].seen(type("time-up")));
});

test("every member of the group hears that a drawing reached the server", async () => {
  const { clients } = await seamRoom(4, 1, 300);
  const starts = clients.map((c) => c.wait(type("seam-round-start")));
  clients[0].send({ type: "start-game" });
  const msgs = await Promise.all(starts);
  const sender = clients[0];
  const group = msgs[0].members.map((m: Msg) => m.id);
  const mates = clients.filter((c) => group.includes(c.playerId));
  const others = clients.filter((c) => !group.includes(c.playerId));
  const told = mates.map((c) => c.wait(type("drawing-received")));
  sender.send({ type: "submit-seam-drawing", imageDataUrl: IMG, round: 1 });
  for (const m of await Promise.all(told))
    assert.deepEqual(m, {
      type: "drawing-received",
      round: 1,
      playerId: sender.playerId,
    });
  await sleep(50);
  for (const c of others) assert.ok(!c.seen(type("drawing-received")));
});

test("a drawing for another round is dropped", async () => {
  const { clients } = await seamRoom(2, 2, 300);
  const [host, guest] = clients;
  const round1 = host.wait(type("seam-round-start"));
  host.send({ type: "start-game" });
  await round1;
  const round2 = host.wait(
    (m) => m.type === "seam-round-start" && m.round === 2,
  );
  host.send({ type: "submit-seam-drawing", imageDataUrl: IMG, round: 1 });
  guest.send({ type: "submit-seam-drawing", imageDataUrl: IMG, round: 1 });
  await round2;
  // A copy of round 1's drawing turns up late, during round 2.
  guest.send({ type: "submit-seam-drawing", imageDataUrl: IMG, round: 1 });
  await sleep(50);
  const reveal = host.wait(phase("seam-reveal"));
  host.send({ type: "submit-seam-drawing", imageDataUrl: IMG, round: 2 });
  await sleep(100);
  assert.ok(
    !host.seen((m) => m.type === "seam-round-results" && m.round === 2),
  );
  guest.send({ type: "submit-seam-drawing", imageDataUrl: IMG, round: 2 });
  await reveal;
  const final = await host.wait(type("seam-final-results"));
  assert.equal(final.drawings.length, 2);
});

test("a drawing that isn't a PNG is ignored", async () => {
  const { clients } = await seamRoom(2, 1, 300);
  const [host, guest] = clients;
  const started = host.wait(type("seam-round-start"));
  host.send({ type: "start-game" });
  await started;
  guest.send({
    type: "submit-seam-drawing",
    imageDataUrl: "javascript:alert(1)",
    round: 1,
  });
  await sleep(50);
  assert.ok(!host.seen(type("drawing-received")));
});

test("needs 2 players, and holds at most 10", async () => {
  const { code, clients } = await seamRoom(1);
  const refused = clients[0].wait(type("error"));
  clients[0].send({ type: "start-game" });
  assert.equal(
    (await refused).message,
    "O modo Emenda precisa de pelo menos 2 jogadores",
  );

  for (let i = 1; i < 10; i++) {
    const c = await join(srv.url, code, `p${i}`);
    assert.ok(c.state, `player ${i + 1} joins`);
  }
  const eleventh = await join(srv.url, code, "p10");
  assert.ok(eleventh.seen(type("error")));
  assert.equal(eleventh.state, null);
});

test("leaving: a trio member who leaves mid-round leaves a blank layer, and the round goes on", async () => {
  const { clients } = await seamRoom(3, 2, 300);
  const [host, a, leaver] = clients;
  sendsAtOnce(host);
  sendsAtOnce(a);
  const started = leaver.wait(type("seam-round-start"));
  const results = host.wait(type("seam-round-results"), 3_000);
  host.send({ type: "start-game" });
  await started;
  leaver.close();

  const { drawings } = await results;
  assert.equal(drawings.length, 1);
  const [d] = drawings;
  assert.equal(d.layers.length, 3);
  const gone = d.memberIds.indexOf(leaver.playerId);
  assert.equal(d.memberNames[gone], leaver.name, "the name stays");
  d.layers.forEach((layer: string | null, i: number) =>
    i === gone ? assert.equal(layer, null) : assert.ok(layer),
  );

  // Round 2 goes on as one pair.
  const next = await host.wait(
    (m) => m.type === "seam-round-start" && m.round === 2,
  );
  assert.equal(next.members.length, 2);
  assert.ok(!host.seen(type("notice")));
});

test("leaving: in a 2-player room, a partner leaving ends the game", async () => {
  const { clients } = await seamRoom(2, 2, 300);
  const [host, guest] = clients;
  const started = guest.wait(phase("seam-drawing"));
  host.send({ type: "start-game" });
  await started;

  const notice = host.wait(type("notice"));
  const final = host.wait(type("seam-final-results"));
  const finalPhase = host.wait(phase("seam-final"));
  guest.close();
  assert.ok((await notice).message);
  // Round 1 never finished, so there is nothing to show.
  assert.equal((await final).drawings.length, 0);
  await finalPhase;
});

test("leaving: a leave during the reveal that leaves fewer than 2 ends in seam-final, keeping the revealed round", async (t) => {
  // Real-time phases, so the reveal is still on when the guest leaves.
  const scale = config.timeScale;
  config.timeScale = 1;
  t.after(() => (config.timeScale = scale));
  const { clients } = await seamRoom(2, 2, 300);
  const [host, guest] = clients;
  sendsAtOnce(host);
  sendsAtOnce(guest);
  const reveal = host.wait(phase("seam-reveal"), 3_000);
  host.send({ type: "start-game" });
  await reveal;

  const notice = host.wait(type("notice"));
  const final = host.wait(type("seam-final-results"));
  const finalPhase = host.wait(phase("seam-final"));
  guest.close();
  assert.ok((await notice).message);
  const { drawings } = await final;
  assert.equal(drawings.length, 1, "round 1 was revealed, so it stays");
  assert.equal(drawings[0].round, 1);
  assert.ok(drawings[0].layers.every((l: string | null) => l));
  await finalPhase;
  assert.ok(
    !host.seen((m) => m.type === "seam-round-start" && m.round === 2),
    "round 2 never started",
  );
});

test("leaving: the last member a round waits for leaves, and the round ends early", async () => {
  // A 6 s turn (300 s × 0.02): the results come long before it.
  const { clients } = await seamRoom(4, 2, 300);
  const [host, a, b, leaver] = clients;
  for (const c of [host, a, b]) sendsAtOnce(c);
  const started = leaver.wait(type("seam-round-start"));
  const results = host.wait(type("seam-round-results"), 1_500);
  host.send({ type: "start-game" });
  await started;
  await sleep(50); // the others' layers are in
  leaver.close();

  const { drawings } = await results;
  assert.equal(drawings.length, 2, "two pairs");
  const theirs = drawings.find((d: Msg) =>
    d.memberIds.includes(leaver.playerId),
  );
  const gone = theirs.memberIds.indexOf(leaver.playerId);
  assert.equal(theirs.layers[gone], null);
  assert.ok(theirs.layers[1 - gone], "the partner's layer is there");
  assert.ok(!host.seen(type("notice")), "three players carry on");
});

test("a player back mid-round gets their group again, with who has submitted", async () => {
  const { code, clients } = await seamRoom(2, 1, 300);
  const [host, guest] = clients;
  const started = host.wait(type("seam-round-start"));
  host.send({ type: "start-game" });
  const first = await started;
  const received = host.wait(type("drawing-received"));
  guest.send({ type: "submit-seam-drawing", imageDataUrl: IMG, round: 1 });
  await received;

  host.close();
  await sleep(20);
  const back = await connect(srv.url, "host-again");
  const start = back.wait(type("seam-round-start"));
  back.send({ type: "rejoin", roomCode: code, token: host.token });
  const m = await start;
  assert.equal(m.groupId, first.groupId);
  assert.equal(m.index, first.index);
  assert.equal(m.submitted, false);
  assert.deepEqual(m.partnerSubmitted, [guest.playerId]);
});

test("play again: from seam-final back to the lobby, and the next game starts clean", async () => {
  const { clients } = await seamRoom(2, 1, 15);
  const [host, guest] = clients;
  for (const c of clients) sendsAtOnce(c);
  const final = host.wait(phase("seam-final"), 5_000);
  host.send({ type: "start-game" });
  await final;

  const lobby = guest.wait(
    (m) => m.type === "room-state" && m.state.phase === "lobby",
  );
  host.send({ type: "play-again" });
  const { state } = await lobby;
  assert.equal(state.round, 0);

  const again = host.wait(type("seam-final-results"), 5_000);
  host.send({ type: "start-game" });
  const { drawings } = await again;
  assert.equal(drawings.length, 1);
  assert.equal(drawings[0].round, 1);
});
