import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { startServer } from "./server.js";
import { createRoom, type, IMG, type TestClient, type Msg } from "./client.js";

// Whole games run here, so speed the phases up 50x:
// theme-creation 600ms, votings 400ms, drawing (15s turn) 300ms, reveal 200ms, scoreboard 160ms.
let srv: Awaited<ReturnType<typeof startServer>>;
before(async () => { srv = await startServer({ timeScale: 0.02 }); });
after(() => srv.stop());

/** Makes a client play on its own: submits a theme and, when paired, a drawing. */
function autoplay(c: TestClient) {
  c.on((m) => {
    if (m.type === "phase-change" && m.phase === "theme-creation") c.send({ type: "submit-theme", text: `tema de ${c.name}` });
    if (m.type === "pair-assigned") c.send({ type: "submit-drawing", imageDataUrl: IMG });
  });
}

test("odd player count: one player sits out per round, rotating, and still votes", async () => {
  const { clients } = await createRoom(srv.url, 5, { gameMode: "party", totalRounds: 2, turnDuration: 15 });
  const paired: Record<number, Set<string>> = { 1: new Set(), 2: new Set() };
  for (const c of clients) {
    autoplay(c);
    c.on((m) => {
      if (m.type === "pair-assigned") paired[currentRound(c)].add(c.name);
    });
  }
  const final = clients[0].wait(type("final-results"), 20_000);
  clients[0].send({ type: "start-game" });
  const result = await final;

  const satOut = (round: number) => clients.map((c) => c.name).filter((n) => !paired[round].has(n));
  assert.equal(satOut(1).length, 1);
  assert.equal(satOut(2).length, 1);
  assert.notEqual(satOut(1)[0], satOut(2)[0], "a different player sits out each round");

  // final-results carries every round, with who drew what
  assert.equal(result.drawings.length, 4, "2 pairs x 2 rounds");
  assert.deepEqual([...new Set(result.drawings.map((d: Msg) => d.round))].sort(), [1, 2]);
  for (const d of result.drawings) {
    assert.ok(d.playerNames.every((n: string) => /^p\d$/.test(n)), JSON.stringify(d.playerNames));
    assert.ok(d.imageLeftDataUrl && d.imageRightDataUrl);
  }
});

/** The round a client is in, from the last phase-change it saw. */
function currentRound(c: TestClient): number {
  return c.msgs.findLast((m) => m.type === "phase-change")?.round ?? 0;
}

test("drawing votes: one pair per rank and one rank per pair, per voter", async () => {
  const { clients } = await createRoom(srv.url, 6, { gameMode: "party", totalRounds: 1, turnDuration: 15 });
  clients.forEach(autoplay);
  const voter = clients[0];

  const ready = voter.wait(type("drawings-ready"), 10_000);
  const reveal = voter.wait(type("reveal-data"), 10_000);
  clients[0].send({ type: "start-game" });

  const ownPair = (await voter.wait(type("pair-assigned"), 10_000)).pairId;
  const [X, Y] = (await ready).drawings.map((d: Msg) => d.pairId).filter((id: string) => id !== ownPair);

  voter.send({ type: "vote-drawing", pairId: ownPair, rank: 1 }); // own pair: ignored
  voter.send({ type: "vote-drawing", pairId: X, rank: 1 });
  voter.send({ type: "vote-drawing", pairId: X, rank: 2 }); // X moves from 1st to 2nd (one rank per pair)
  voter.send({ type: "vote-drawing", pairId: Y, rank: 2 }); // Y takes 2nd away from X (one pair per rank)

  const { drawings, players } = await reveal;
  const votes = (id: string) => drawings.find((d: Msg) => d.pairId === id).votes;
  assert.deepEqual(votes(X), { first: 0, second: 0, third: 0 });
  assert.deepEqual(votes(Y), { first: 0, second: 1, third: 0 });
  assert.deepEqual(votes(ownPair), { first: 0, second: 0, third: 0 });

  // a 2nd place is worth 2, doubled because the single round is also the final one
  const scores = players.map((p: Msg) => p.score).sort((a: number, b: number) => b - a);
  assert.deepEqual(scores, [4, 4, 0, 0, 0, 0]);
});

test("with 4 players theme voting is skipped; with more it is not", async () => {
  for (const [count, expectVoting] of [[4, false], [6, true]] as const) {
    const { clients } = await createRoom(srv.url, count, { gameMode: "party", totalRounds: 1, turnDuration: 15 });
    clients.forEach(autoplay);
    const final = clients[0].wait(type("final-results"), 10_000);
    clients[0].send({ type: "start-game" });
    await final;
    const phases = clients[0].msgs.filter((m) => m.type === "phase-change").map((m) => m.phase);
    assert.equal(phases.includes("theme-voting"), expectVoting, `${count} players: ${phases.join(" → ")}`);
    assert.equal(phases.at(-1), "final-results");
  }
});
