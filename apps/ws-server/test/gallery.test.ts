import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { startServer } from "./server.js";
import {
  connect,
  join,
  type,
  sleep,
  IMG,
  type TestClient,
  type Msg,
} from "./client.js";
import type { Accounts, GalleryEntry } from "../src/accounts.js";
import { MAX_SAVED_IMAGE_BYTES } from "../src/gallery.js";

const PNG_SIGNATURE = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);

/** Stands in for Supabase: Ana has an account, and saves are recorded here. */
function fakeAccounts(result: "saved" | "limit" | "failed" = "saved") {
  const saves: GalleryEntry[] = [];
  const accounts: Accounts & { result: typeof result; delayMs: number } = {
    result,
    delayMs: 0,
    async profileFromToken(t) {
      return t === "tok-ana"
        ? { userId: "u-ana", username: "Ana_99", avatarUrl: "https://x/a.png" }
        : null;
    },
    async saveDrawing(entry) {
      if (accounts.delayMs) await sleep(accounts.delayMs);
      if (accounts.result === "saved") saves.push(entry);
      return accounts.result;
    },
  };
  return { accounts, saves };
}

let srv: Awaited<ReturnType<typeof startServer>> | undefined;
afterEach(async () => {
  await srv?.stop();
  srv = undefined;
});

async function host(url: string, options: object, account = true) {
  const c = await connect(url, "host");
  const created = c.wait(type("room-state"));
  c.send({
    type: "create-room",
    nickname: "Convidado",
    ...(account ? { accessToken: "tok-ana" } : {}),
    ...options,
  });
  await created;
  return c;
}

/** A one-round party game with Ana (account) and three guests, played to the final screen. */
async function partyFinal(accounts: Accounts) {
  srv = await startServer({ accounts, timeScale: 0.02 });
  const ana = await host(srv.url, {
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
  const drawings: Msg[] = (await final).drawings;
  return { ana, clients, drawings };
}

const refOf = (d: Msg) => ({ round: d.round, pairId: d.pairId });
const keyOf = (d: Msg) => `${d.round}:${d.pairId}`;

/** Sends `save-drawing` and resolves with the server's answer to this client. */
async function save(
  c: TestClient,
  drawing: unknown,
  imageDataUrl: unknown = IMG,
) {
  const answered = c.wait(
    (m) => m.type === "drawing-saved" || m.type === "drawing-save-failed",
  );
  c.send({ type: "save-drawing", drawing, imageDataUrl });
  return answered;
}

test("a logged-in player saves a party drawing: the server supplies mode, theme and authors", async () => {
  const { accounts, saves } = fakeAccounts();
  const { ana, clients, drawings } = await partyFinal(accounts);
  const d = drawings[0];
  const others = clients.slice(1).map((c) => c.wait(type("drawing-saved")));

  const answer = await save(ana, {
    ...refOf(d),
    theme: "mentira",
    authorNames: ["X"],
  });
  assert.deepEqual(answer, { type: "drawing-saved", key: keyOf(d) });
  for (const m of await Promise.all(others)) assert.equal(m.key, keyOf(d));

  assert.equal(saves.length, 1);
  const [entry] = saves;
  assert.equal(entry.gameMode, "party");
  assert.equal(entry.theme, d.themeText);
  assert.deepEqual(entry.authorNames, d.playerNames);
  assert.deepEqual(
    entry.authorIds,
    d.playerNames.map((n: string) => (n === "Ana_99" ? "u-ana" : null)),
  );
  assert.equal(entry.savedBy, "u-ana");
  assert.ok(entry.png.subarray(0, 8).equals(PNG_SIGNATURE));

  // Someone who (re)joins later is told what is already saved.
  ana.close();
  await sleep(50);
  const back = await connect(srv!.url, "back");
  const state = back.wait(type("room-state"));
  back.send({ type: "rejoin", roomCode: ana.state.code, token: ana.token });
  assert.deepEqual((await state).state.savedDrawings, [keyOf(d)]);
});

test("saves that aren't allowed are refused, to the sender only, and nothing is written", async () => {
  const { accounts, saves } = fakeAccounts();
  const { ana, clients, drawings } = await partyFinal(accounts);
  const d = drawings[0];
  const bia = clients[1];
  const refused = async (c: TestClient, drawing: unknown, image?: unknown) => {
    const answer = await save(c, drawing, image);
    assert.equal(answer.type, "drawing-save-failed");
    assert.equal(answer.reason, "not-allowed");
  };

  await refused(bia, refOf(d)); // a guest
  await refused(ana, { round: 9, pairId: d.pairId }); // no such round
  await refused(ana, { round: d.round, pairId: "nope" }); // no such pair
  await refused(ana, { round: d.round }); // party needs the pair
  await refused(ana, "what"); // not a reference at all
  await refused(ana, refOf(d), "data:image/jpeg;base64,AAAA"); // not a PNG
  await refused(
    ana,
    refOf(d),
    "data:image/png;base64," +
      Buffer.from("not really a png").toString("base64"),
  );
  await refused(
    ana,
    refOf(d),
    "data:image/png;base64," +
      Buffer.concat([
        PNG_SIGNATURE,
        Buffer.alloc(MAX_SAVED_IMAGE_BYTES),
      ]).toString("base64"),
  );
  await refused(ana, refOf(d), 42);

  // A good save, then the same drawing again.
  assert.equal((await save(ana, refOf(d))).type, "drawing-saved");
  await refused(ana, refOf(d));

  assert.equal(saves.length, 1);
  await sleep(50);
  assert.equal(bia.msgs.filter(type("drawing-save-failed")).length, 1);
  assert.equal(clients[2].seen(type("drawing-save-failed")), false);
});

test("nothing can be saved before the final screen, or with accounts off", async () => {
  const { accounts, saves } = fakeAccounts();
  srv = await startServer({ accounts });
  const ana = await host(srv.url, { gameMode: "split-body" });
  assert.equal((await save(ana, { round: 1 })).reason, "not-allowed");
  await join(srv.url, ana.state.code, "Bia");
  ana.send({ type: "start-game" });
  await ana.wait(type("split-round-start"));
  assert.equal((await save(ana, { round: 1 })).reason, "not-allowed");
  assert.equal(saves.length, 0);
  await srv.stop();

  srv = await startServer({ accounts: null });
  const guest = await host(srv.url, {}, false);
  assert.equal((await save(guest, { round: 1 })).reason, "not-allowed");
});

test("a daily limit or a failed write is reported, and a failed drawing can be saved again", async () => {
  const { accounts, saves } = fakeAccounts("limit");
  const { ana, drawings } = await partyFinal(accounts);
  const d = drawings[0];

  assert.equal((await save(ana, refOf(d))).reason, "limit");
  accounts.result = "failed";
  assert.equal((await save(ana, refOf(d))).reason, "failed");
  accounts.result = "saved";
  assert.equal((await save(ana, refOf(d))).type, "drawing-saved");
  assert.equal(saves.length, 1);
});

test("two saves of the same drawing at the same moment make one entry", async () => {
  const { accounts, saves } = fakeAccounts();
  accounts.delayMs = 150;
  const { ana, drawings } = await partyFinal(accounts);
  const d = drawings[0];

  ana.send({ type: "save-drawing", drawing: refOf(d), imageDataUrl: IMG });
  ana.send({ type: "save-drawing", drawing: refOf(d), imageDataUrl: IMG });
  await sleep(400);
  assert.equal(saves.length, 1);
  assert.equal(ana.msgs.filter(type("drawing-saved")).length, 1);
  assert.equal(ana.msgs.filter(type("drawing-save-failed")).length, 1);
});

test("a split-body drawing still names the partner who left before the final screen", async () => {
  const { accounts, saves } = fakeAccounts();
  srv = await startServer({ accounts, graceMs: 30 });
  const ana = await host(srv.url, { gameMode: "split-body", totalRounds: 2 });
  const bia = await join(srv.url, ana.state.code, "Bia");
  for (const c of [ana, bia])
    c.on((m) => {
      if (m.type === "split-round-start" && m.round === 1)
        c.send({ type: "submit-split-drawing", imageDataUrl: IMG });
    });
  const round2 = ana.wait(
    (m) => m.type === "split-round-start" && m.round === 2,
  );
  ana.send({ type: "start-game" });
  await round2;

  // Bia leaves during round 2: the game ends with round 1 only.
  const final = ana.wait(type("split-final-results"));
  bia.close();
  await final;

  assert.equal((await save(ana, { round: 1 })).type, "drawing-saved");
  const [entry] = saves;
  assert.equal(entry.gameMode, "split-body");
  assert.equal(entry.theme, null);
  assert.deepEqual([...entry.authorNames].sort(), ["Ana_99", "Bia"]);
  assert.deepEqual(
    entry.authorIds,
    entry.authorNames.map((n) => (n === "Ana_99" ? "u-ana" : null)),
  );
  // Round 2 was never finished, so there is nothing to save.
  assert.equal((await save(ana, { round: 2 })).reason, "not-allowed");
});
