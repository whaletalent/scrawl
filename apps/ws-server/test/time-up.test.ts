import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { startServer } from "./server.js";
import { connect, createRoom, type, IMG, sleep, type Msg } from "./client.js";

/**
 * When a drawing turn runs out, the server says so (`time-up`) and waits a
 * moment for the drawings, instead of trusting every player's clock to send
 * theirs in time. A drawing is tagged with its round, so one that arrives
 * late is dropped instead of landing in the next round.
 */
let srv: Awaited<ReturnType<typeof startServer>>;
before(async () => {
  srv = await startServer({ timeScale: 0.02, submitGraceMs: 300 });
});
after(() => srv.stop());

/** A player who only ever sends their drawing when the server says time is up. */
function sendsOnTimeUp(
  c: Awaited<ReturnType<typeof createRoom>>["clients"][number],
  kind: string,
) {
  let round = 0;
  c.on((m) => {
    if (m.type === "face-round-start" || m.type === "split-round-start")
      round = m.round;
    if (m.type === "time-up") c.send({ type: kind, imageDataUrl: IMG, round });
  });
}

test("face-builder: drawings sent when time is up make it into every round", async () => {
  const { clients } = await createRoom(srv.url, 2, {
    gameMode: "face-builder",
    totalRounds: 3,
    turnDuration: 15,
  });
  for (const c of clients) sendsOnTimeUp(c, "submit-face-drawing");
  const final = clients[0].wait(type("face-final-results"), 10_000);
  clients[0].send({ type: "start-game" });
  const { drawings } = await final;
  assert.equal(drawings.length, 3);
  for (const d of drawings as Msg[]) {
    assert.ok(d.player1ImageDataUrl, `round ${d.round}: player 1 missing`);
    assert.ok(d.player2ImageDataUrl, `round ${d.round}: player 2 missing`);
  }
});

test("split-body: drawings sent when time is up make it into every round", async () => {
  const { clients } = await createRoom(srv.url, 2, {
    gameMode: "split-body",
    totalRounds: 2,
    turnDuration: 15,
  });
  for (const c of clients) sendsOnTimeUp(c, "submit-split-drawing");
  const final = clients[0].wait(type("split-final-results"), 10_000);
  clients[0].send({ type: "start-game" });
  const { drawings } = await final;
  for (const d of drawings as Msg[]) {
    assert.ok(d.topImageDataUrl && d.bottomImageDataUrl, `round ${d.round}`);
  }
});

test("a drawing for an earlier round is dropped, not put into the current one", async () => {
  const { clients } = await createRoom(srv.url, 2, {
    gameMode: "face-builder",
    totalRounds: 2,
    turnDuration: 300,
  });
  const [host, guest] = clients;
  const round1 = host.wait(type("face-round-start"));
  host.send({ type: "start-game" });
  await round1;
  // Both finish round 1 by hand.
  const round2 = host.wait(
    (m) => m.type === "face-round-start" && m.round === 2,
  );
  host.send({ type: "submit-face-drawing", imageDataUrl: IMG, round: 1 });
  guest.send({ type: "submit-face-drawing", imageDataUrl: IMG, round: 1 });
  await round2;
  // A copy of round 1's drawing turns up late, during round 2.
  guest.send({ type: "submit-face-drawing", imageDataUrl: IMG, round: 1 });
  await sleep(50);
  // Round 2 still waits for both: the late one didn't count.
  const final = host.wait(type("face-final-results"));
  host.send({ type: "submit-face-drawing", imageDataUrl: IMG, round: 2 });
  await sleep(100);
  assert.ok(!host.seen(type("face-final-results")));
  guest.send({ type: "submit-face-drawing", imageDataUrl: IMG, round: 2 });
  assert.equal((await final).drawings.length, 2);
});

test("a player who sends nothing, even after time-up, leaves the round with a blank part once the grace runs out", async () => {
  const { clients } = await createRoom(srv.url, 2, {
    gameMode: "face-builder",
    totalRounds: 1,
    turnDuration: 15,
  });
  const [host] = clients;
  sendsOnTimeUp(host, "submit-face-drawing");
  const final = host.wait(type("face-final-results"), 10_000);
  host.send({ type: "start-game" });
  const [d] = (await final).drawings;
  assert.ok(d.player1ImageDataUrl);
  assert.equal(d.player2ImageDataUrl, null);
});

test("party: drawings sent when time is up are counted", async () => {
  const { clients } = await createRoom(srv.url, 4, {
    totalRounds: 1,
    turnDuration: 15,
  });
  let round = 0;
  for (const c of clients)
    c.on((m) => {
      if (m.type === "phase-change") round = m.round ?? round;
      if (m.type === "phase-change" && m.phase === "theme-creation")
        c.send({ type: "submit-theme", text: `tema ${c.name}` });
      if (m.type === "time-up")
        c.send({ type: "submit-drawing", imageDataUrl: IMG, round });
    });
  const ready = clients[0].wait(type("drawings-ready"), 10_000);
  clients[0].send({ type: "start-game" });
  const { drawings } = await ready;
  for (const d of drawings as Msg[]) {
    assert.ok(d.imageLeftDataUrl && d.imageRightDataUrl);
  }
});

test("both players are told when a drawing reaches the server, with its round", async () => {
  const { clients } = await createRoom(srv.url, 2, {
    gameMode: "face-builder",
    totalRounds: 2,
    turnDuration: 300,
  });
  const [host, guest] = clients;
  const started = guest.wait(type("face-round-start"));
  host.send({ type: "start-game" });
  await started;
  const toHost = host.wait(type("drawing-received"));
  const toGuest = guest.wait(type("drawing-received"));
  guest.send({ type: "submit-face-drawing", imageDataUrl: IMG, round: 1 });
  for (const m of await Promise.all([toHost, toGuest]))
    assert.deepEqual(m, {
      type: "drawing-received",
      round: 1,
      playerId: guest.playerId,
    });
});

test("a player back in the room mid-round learns whether the partner's drawing is in", async () => {
  const { code, clients } = await createRoom(srv.url, 2, {
    gameMode: "split-body",
    totalRounds: 2,
    turnDuration: 300,
  });
  const [host, guest] = clients;
  const started = guest.wait(type("split-round-start"));
  host.send({ type: "start-game" });
  await started;
  const received = host.wait(type("drawing-received"));
  guest.send({ type: "submit-split-drawing", imageDataUrl: IMG, round: 1 });
  await received;

  host.close();
  await sleep(30);
  const back = await connect(srv.url, "host-again");
  const start = back.wait(type("split-round-start"));
  back.send({ type: "rejoin", roomCode: code, token: host.token });
  const m = await start;
  assert.equal(m.submitted, false);
  assert.equal(m.partnerSubmitted, true);
});

test("party: only the two players of a pair hear about each other's drawing", async () => {
  const { clients } = await createRoom(srv.url, 4, {
    totalRounds: 1,
    turnDuration: 300,
  });
  const pairs = new Map<string, { pairId: string; partnerId: string }>();
  for (const c of clients)
    c.on((m) => {
      if (m.type === "phase-change" && m.phase === "theme-creation")
        c.send({ type: "submit-theme", text: `tema ${c.name}` });
      if (m.type === "pair-assigned") pairs.set(c.playerId, m);
    });
  const drawing = clients[0].wait(
    (m) => m.type === "phase-change" && m.phase === "drawing",
    10_000,
  );
  clients[0].send({ type: "start-game" });
  await drawing;
  await sleep(50);

  const sender = clients[0];
  const partner = clients.find(
    (c) => c.playerId === pairs.get(sender.playerId)!.partnerId,
  )!;
  const others = clients.filter((c) => c !== sender && c !== partner);
  const told = partner.wait(type("drawing-received"));
  sender.send({ type: "submit-drawing", imageDataUrl: IMG, round: 1 });
  assert.equal((await told).playerId, sender.playerId);
  await sleep(50);
  for (const c of others) assert.ok(!c.seen(type("drawing-received")));
});
