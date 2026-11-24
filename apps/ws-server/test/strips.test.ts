import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { startServer } from "./server.js";
import {
  connect,
  createRoom,
  type,
  phase,
  sleep,
  IMG,
  pngDataUrl,
  type Msg,
  type TestClient,
} from "./client.js";
import { STRIP_FPS } from "../src/strips.js";

/**
 * Live strips: neighbours share a 100-px strip. Each browser sends its own
 * layer cropped to the strip (`strip-frame`); the server relays it only to the
 * member across that strip, keeps the latest one per (group, strip, member)
 * for rejoin, and puts the kept frames in the round's results.
 */
let srv: Awaited<ReturnType<typeof startServer>>;
before(async () => {
  srv = await startServer({ timeScale: 0.02, submitGraceMs: 50, graceMs: 50 });
});
after(() => srv.stop());

/** Distinct, valid PNG data URLs, so a test can tell frames apart. */
const frame = (n: number) => pngDataUrl(n, 600);

const isFrame = type("strip-frame");

/** Starts an Emenda room of `n` players; resolves with each client's `seam-round-start`. */
async function seamDrawing(n: number, totalRounds = 1) {
  const { code, clients } = await createRoom(srv.url, n, {
    gameMode: "seam",
    totalRounds,
    turnDuration: 300,
  });
  const starts = clients.map((c) => c.wait(type("seam-round-start")));
  clients[0].send({ type: "start-game" });
  const msgs = await Promise.all(starts);
  return { code, clients, msgs };
}

/** The clients of a seam group, left to right. */
function membersOf(clients: TestClient[], start: Msg): TestClient[] {
  return start.members.map((m: Msg) =>
    clients.find((c) => c.playerId === m.id)!,
  );
}

/** Starts a Racha-tema room of `n` players and waits for its drawing turn. */
async function partyDrawing(n: number) {
  const { code, clients } = await createRoom(srv.url, n, {
    totalRounds: 1,
    turnDuration: 300,
  });
  const pairs = new Map<string, Msg>();
  for (const c of clients)
    c.on((m) => {
      if (m.type === "phase-change" && m.phase === "theme-creation")
        c.send({ type: "submit-theme", text: `tema ${c.name}` });
      if (m.type === "pair-assigned") pairs.set(c.playerId, m);
    });
  // Every client's own phase-change, not just the host's: each socket gets its
  // pair-assigned before its phase-change, but the sockets race each other, so
  // the host's phase-change alone doesn't mean every pair-assigned has landed
  // (a drawer would then look like the player sitting out).
  const drawing = clients.map((c) => c.wait(phase("drawing"), 10_000));
  clients[0].send({ type: "start-game" });
  await Promise.all(drawing);
  return { code, clients, pairs };
}

const send = (c: TestClient, strip: number, imageDataUrl: string, round = 1) =>
  c.send({ type: "strip-frame", round, strip, imageDataUrl });

test("pair: a frame reaches only the partner (Emenda)", async () => {
  const { clients, msgs } = await seamDrawing(2);
  const [left, right] = membersOf(clients, msgs[0]);
  const got = right.wait(isFrame);
  send(left, 0, frame(1));
  assert.deepEqual(await got, {
    type: "strip-frame",
    round: 1,
    strip: 0,
    playerId: left.playerId,
    imageDataUrl: frame(1),
  });
  await sleep(50);
  assert.ok(!left.seen(isFrame), "the sender doesn't get its own frame");
});

test("pair: a frame reaches only the partner (Racha-tema, 4 players)", async () => {
  const { clients, pairs } = await partyDrawing(4);
  const sender = clients[0];
  const partner = clients.find(
    (c) => c.playerId === pairs.get(sender.playerId)!.partnerId,
  )!;
  const others = clients.filter((c) => c !== sender && c !== partner);
  const got = partner.wait(isFrame);
  send(sender, 0, frame(2));
  const m = await got;
  assert.equal(m.playerId, sender.playerId);
  assert.equal(m.strip, 0);
  assert.equal(m.imageDataUrl, frame(2));
  await sleep(50);
  for (const c of [sender, ...others]) assert.ok(!c.seen(isFrame), c.name);
});

test("pair: the player sitting out never sees a frame (Racha-tema, 5 players)", async () => {
  const { clients, pairs } = await partyDrawing(5);
  const sitOuts = clients.filter((c) => !pairs.has(c.playerId));
  assert.equal(sitOuts.length, 1, "exactly one player sits out");
  const [sitOut] = sitOuts;
  const drawers = clients.filter((c) => c !== sitOut);
  const told = drawers.map((c) => c.wait(isFrame));
  for (const c of drawers) send(c, 0, frame(3));
  await Promise.all(told);
  // The sit-out player may not send one either.
  send(sitOut, 0, frame(4));
  await sleep(50);
  assert.ok(!sitOut.seen(isFrame));
  for (const c of drawers)
    assert.equal(c.msgs.filter(isFrame).length, 1, c.name);
});

test("trio: each strip reaches only its neighbour", async () => {
  const { clients, msgs } = await seamDrawing(3);
  const [m0, m1, m2] = membersOf(clients, msgs[0]);

  const toRight = m2.wait(isFrame);
  send(m1, 1, frame(5));
  assert.equal((await toRight).strip, 1);
  await sleep(50);
  assert.ok(!m0.seen(isFrame));

  const toLeft = m0.wait(isFrame);
  send(m1, 0, frame(6));
  const m = await toLeft;
  assert.equal(m.strip, 0);
  assert.equal(m.imageDataUrl, frame(6));
  await sleep(50);
  assert.equal(m2.msgs.filter(isFrame).length, 1);

  // The edge members reach the middle one only.
  const fromEdges = m1.wait(isFrame);
  send(m0, 0, frame(7));
  assert.equal((await fromEdges).playerId, m0.playerId);
  const fromRight = m1.wait(isFrame);
  send(m2, 1, frame(8));
  assert.equal((await fromRight).playerId, m2.playerId);
  await sleep(50);
  assert.equal(m0.msgs.filter(isFrame).length, 1);
  assert.equal(m2.msgs.filter(isFrame).length, 1);
});

test("dropped frames: wrong round, an untouched strip, not a PNG, too big, outside the drawing turn", async () => {
  // Outside a drawing turn: in the lobby.
  const lobby = await createRoom(srv.url, 2, {
    gameMode: "seam",
    turnDuration: 300,
  });
  send(lobby.clients[0], 0, frame(9));
  await sleep(100);
  assert.ok(!lobby.clients[1].seen(isFrame), "lobby");

  // Another mode that has no strips.
  const split = await createRoom(srv.url, 2, {
    gameMode: "split-body",
    turnDuration: 300,
  });
  const splitStart = split.clients[1].wait(type("split-round-start"));
  split.clients[0].send({ type: "start-game" });
  await splitStart;
  send(split.clients[0], 0, frame(9));
  await sleep(100);
  assert.ok(!split.clients[1].seen(isFrame), "split-body");

  const { clients, msgs } = await seamDrawing(2);
  const [left, right] = membersOf(clients, msgs[0]);
  const bad: [string, () => void][] = [
    ["wrong round", () => send(left, 0, frame(10), 2)],
    [
      "no round",
      () =>
        left.send({ type: "strip-frame", strip: 0, imageDataUrl: frame(10) }),
    ],
    ["untouched strip", () => send(left, 1, frame(10))],
    [
      "strip as text",
      () =>
        left.send({
          type: "strip-frame",
          round: 1,
          strip: "0",
          imageDataUrl: frame(10),
        }),
    ],
    ["not a PNG", () => send(left, 0, "data:image/svg+xml;base64,AAAA")],
    [
      "not a string",
      () =>
        left.send({
          type: "strip-frame",
          round: 1,
          strip: 0,
          imageDataUrl: 42,
        }),
    ],
    [
      "over 150 000 chars",
      () => send(left, 0, "data:image/png;base64," + "A".repeat(150_000)),
    ],
  ];
  for (const [name, act] of bad) {
    act();
    await sleep(100);
    assert.ok(!right.seen(isFrame), name);
  }
  // Sanity: a good one still gets through.
  const got = right.wait(isFrame);
  send(left, 0, frame(11));
  assert.equal((await got).imageDataUrl, frame(11));
});

test("rate limit: 40 frames at once, the neighbour gets at most 15 + 1", async () => {
  const { clients, msgs } = await seamDrawing(2);
  const [left, right] = membersOf(clients, msgs[0]);
  for (let i = 0; i < 40; i++) send(left, 0, frame(i + 1));
  await sleep(300);
  const n = right.msgs.filter(isFrame).length;
  assert.ok(n >= STRIP_FPS && n <= STRIP_FPS + 1, `got ${n}`);
});

test("rejoin replays frames: the neighbour's and the rejoiner's own latest", async () => {
  const { code, clients, msgs } = await seamDrawing(2);
  const [left, right] = membersOf(clients, msgs[0]);
  const toRight = right.wait((m) => isFrame(m) && m.imageDataUrl === frame(2));
  send(left, 0, frame(1));
  send(left, 0, frame(2));
  await toRight;
  const toLeft = left.wait(isFrame);
  send(right, 0, frame(3));
  await toLeft;

  left.close();
  await sleep(20);
  const back = await connect(srv.url, "left-again");
  const start = back.wait(type("seam-round-start"));
  back.send({ type: "rejoin", roomCode: code, token: left.token });
  const m = await start;
  const sorted = [...m.frames].sort((a: Msg, b: Msg) =>
    a.playerId.localeCompare(b.playerId),
  );
  assert.deepEqual(
    sorted,
    [
      { strip: 0, playerId: left.playerId, imageDataUrl: frame(2) },
      { strip: 0, playerId: right.playerId, imageDataUrl: frame(3) },
    ].sort((a, b) => a.playerId.localeCompare(b.playerId)),
  );
});

test("rejoin replays frames in Racha-tema's pair-assigned", async () => {
  const { code, clients, pairs } = await partyDrawing(4);
  const sender = clients[0];
  const partner = clients.find(
    (c) => c.playerId === pairs.get(sender.playerId)!.partnerId,
  )!;
  assert.deepEqual(pairs.get(sender.playerId)!.frames, []);
  const got = partner.wait(isFrame);
  send(sender, 0, frame(4));
  await got;

  partner.close();
  await sleep(20);
  const back = await connect(srv.url, "partner-again");
  const assigned = back.wait(type("pair-assigned"));
  back.send({ type: "rejoin", roomCode: code, token: partner.token });
  assert.deepEqual((await assigned).frames, [
    { strip: 0, playerId: sender.playerId, imageDataUrl: frame(4) },
  ]);
});

test("kept frames ride along in Emenda results", async () => {
  const { clients, msgs } = await seamDrawing(2);
  const [left, right] = membersOf(clients, msgs[0]);
  const toRight = right.wait((m) => isFrame(m) && m.imageDataUrl === frame(2));
  const toLeft = left.wait(isFrame);
  send(left, 0, frame(1));
  send(left, 0, frame(2));
  send(right, 0, frame(3));
  await Promise.all([toRight, toLeft]);

  const results = left.wait(type("seam-round-results"));
  for (const c of [left, right])
    c.send({ type: "submit-seam-drawing", imageDataUrl: IMG, round: 1 });
  const [d] = (await results).drawings;
  const kept = [...d.stripFrames].sort((a: Msg, b: Msg) => a.member - b.member);
  assert.deepEqual(kept, [
    { strip: 0, member: 0, imageDataUrl: frame(2) },
    { strip: 0, member: 1, imageDataUrl: frame(3) },
  ]);
});

test("kept frames ride along in Racha-tema results", async () => {
  const { clients, pairs } = await partyDrawing(4);
  const told = clients.map((c) => c.wait(isFrame));
  clients.forEach((c, i) => send(c, 0, frame(20 + i)));
  await Promise.all(told);

  const ready = clients[0].wait(type("drawings-ready"), 10_000);
  for (const c of clients)
    c.send({ type: "submit-drawing", imageDataUrl: IMG, round: 1 });
  // The turn closes after time-up; wait for it.
  const { drawings } = await ready;
  assert.equal(drawings.length, 2);
  for (const d of drawings as Msg[]) {
    const left = clients.find(
      (c) =>
        pairs.get(c.playerId)!.pairId === d.pairId &&
        pairs.get(c.playerId)!.side === "left",
    )!;
    const right = clients.find(
      (c) => c.playerId === pairs.get(left.playerId)!.partnerId,
    )!;
    const kept = [...d.stripFrames].sort(
      (a: Msg, b: Msg) => a.member - b.member,
    );
    assert.deepEqual(kept, [
      { strip: 0, member: 0, imageDataUrl: frame(20 + clients.indexOf(left)) },
      { strip: 0, member: 1, imageDataUrl: frame(20 + clients.indexOf(right)) },
    ]);
  }
});

test("a player who left keeps their strip in the round's results", async () => {
  const { clients, msgs } = await seamDrawing(3);
  const [m0, m1, m2] = membersOf(clients, msgs[0]);
  const got = m1.wait(isFrame);
  send(m2, 1, frame(30));
  await got;
  m2.close();
  // Wait until the server has dropped them for good.
  await m0.wait(type("player-left"));

  const results = m0.wait(type("seam-round-results"));
  for (const c of [m0, m1])
    c.send({ type: "submit-seam-drawing", imageDataUrl: IMG, round: 1 });
  const [d] = (await results).drawings;
  assert.equal(d.layers[2], null);
  assert.deepEqual(d.stripFrames, [
    { strip: 1, member: 2, imageDataUrl: frame(30) },
  ]);
});
