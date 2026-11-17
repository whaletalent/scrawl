import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { startServer } from "./server.js";
import { createRoom, type, IMG, type Msg } from "./client.js";

let srv: Awaited<ReturnType<typeof startServer>>;
before(async () => { srv = await startServer({ timeScale: 0.02 }); });
after(() => srv.stop());

test("split-body: sides alternate each round and the final has every round", async () => {
  const { clients } = await createRoom(srv.url, 2, { gameMode: "split-body", totalRounds: 3, turnDuration: 60 });
  const [host, guest] = clients;
  for (const c of clients) {
    c.on((m) => { if (m.type === "split-round-start") c.send({ type: "submit-split-drawing", imageDataUrl: IMG }); });
  }
  const final = host.wait(type("split-final-results"));
  host.send({ type: "start-game" });
  const { drawings } = await final;

  const sides = (c: typeof host) => c.msgs.filter((m) => m.type === "split-round-start").map((m) => m.side);
  assert.deepEqual(sides(host), ["top", "bottom", "top"]);
  assert.deepEqual(sides(guest), ["bottom", "top", "bottom"]);
  assert.equal(drawings.length, 3);
  assert.ok(drawings.every((d: Msg) => d.topImageDataUrl && d.bottomImageDataUrl));
  // both players are told the same silhouette each round
  const silhouettes = (c: typeof host) => c.msgs.filter((m) => m.type === "split-round-start").map((m) => m.silhouetteId);
  assert.deepEqual(silhouettes(host), silhouettes(guest));
});

test("split-body: the round advances when the timer runs out, keeping the missing half empty", async () => {
  const { clients } = await createRoom(srv.url, 2, { gameMode: "split-body", totalRounds: 1, turnDuration: 15 }); // 300ms
  const [host] = clients;
  const final = host.wait(type("split-final-results"));
  host.send({ type: "start-game" });
  await host.wait(type("split-round-start"));
  host.send({ type: "submit-split-drawing", imageDataUrl: IMG }); // guest never submits
  const [drawing] = (await final).drawings;
  assert.ok(drawing.topImageDataUrl);
  assert.equal(drawing.bottomImageDataUrl, null);
});

test("face-builder: the 6 regions are split 3 and 3 with no overlap", async () => {
  const { clients } = await createRoom(srv.url, 2, { gameMode: "face-builder", totalRounds: 2, turnDuration: 60, faceTemplate: "robot-face", skinTone: "#4682B4" });
  const [host, guest] = clients;
  for (const c of clients) {
    c.on((m) => { if (m.type === "face-round-start") c.send({ type: "submit-face-drawing", imageDataUrl: IMG }); });
  }
  const final = host.wait(type("face-final-results"));
  host.send({ type: "start-game" });
  const { drawings } = await final;

  const rounds = (c: typeof host) => c.msgs.filter((m) => m.type === "face-round-start");
  for (let i = 0; i < 2; i++) {
    const mine = rounds(host)[i].regions, theirs = rounds(guest)[i].regions;
    assert.equal(mine.length, 3);
    assert.equal(theirs.length, 3);
    assert.deepEqual([...mine, ...theirs].sort(), ["ears", "eyes", "hair", "mouth", "nose", "shoulders"]);
    assert.equal(rounds(host)[i].faceTemplate, "robot-face");
    assert.equal(rounds(host)[i].skinTone, "#4682B4");
  }
  assert.equal(drawings.length, 2);
  assert.ok(drawings.every((d: Msg) => d.player1ImageDataUrl && d.player2ImageDataUrl));
});

test("face-builder: a random template picks a real template for each round", async () => {
  const { clients } = await createRoom(srv.url, 2, { gameMode: "face-builder", totalRounds: 1, faceTemplate: "random" });
  const start = clients[1].wait(type("face-round-start"));
  clients[0].send({ type: "start-game" });
  const round = await start;
  assert.ok(["masculine", "feminine", "monster", "alien-face", "robot-face"].includes(round.faceTemplate));
  assert.match(round.skinTone, /^#[0-9A-Fa-f]{6}$/);
});
