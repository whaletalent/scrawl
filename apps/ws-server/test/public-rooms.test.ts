import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { startServer } from "./server.js";
import {
  connect,
  join,
  type,
  sleep,
  type TestClient,
  type Msg,
} from "./client.js";
import type { Accounts } from "../src/accounts.js";

const AVATAR = "https://x/storage/v1/object/public/avatars/u-ana/1.png";
const fake: Accounts = {
  async profileFromToken(t) {
    return t === "tok-ana"
      ? { userId: "u-ana", username: "Ana_99", avatarUrl: AVATAR }
      : null;
  },
};

let srv: Awaited<ReturnType<typeof startServer>> | undefined;
afterEach(async () => {
  await srv?.stop();
  srv = undefined;
});

/** Creates a room; `account` makes the host the logged-in Ana. */
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

/** A socket watching the list. `rooms()` is the latest list it was sent. */
async function watcher(url: string) {
  const c = await connect(url, "watcher");
  const first = c.wait(type("public-rooms"));
  c.send({ type: "watch-rooms" });
  await first;
  const rooms = (): Msg[] => c.msgs.filter(type("public-rooms")).at(-1).rooms;
  /** Waits until the latest list satisfies `pred`. */
  const until = async (pred: (rooms: Msg[]) => boolean) => {
    for (let i = 0; i < 100 && !pred(rooms()); i++) await sleep(20);
    assert.ok(pred(rooms()), `list never matched: ${JSON.stringify(rooms())}`);
    return rooms();
  };
  return { c, rooms, until };
}

test("a watcher gets the list at once, and a public room created by an account shows up in it", async () => {
  srv = await startServer({ accounts: fake });
  const w = await watcher(srv.url);
  assert.deepEqual(w.rooms(), []);

  const ana = await host(srv.url, { visibility: "public" });
  assert.equal(ana.state.isPublic, true);
  assert.deepEqual(await w.until((r) => r.length === 1), [
    {
      code: ana.state.code,
      hostName: "Ana_99",
      hostAvatarUrl: AVATAR,
      gameMode: "party",
      playerCount: 1,
      capacity: 10,
    },
  ]);

  // Someone who starts watching later sees it straight away.
  const late = await watcher(srv.url);
  assert.equal(late.rooms().length, 1);
});

test('private rooms and guests\' "public" rooms are never listed', async () => {
  srv = await startServer({ accounts: fake });
  const w = await watcher(srv.url);
  const priv = await host(srv.url, {});
  const explicit = await host(srv.url, { visibility: "private" });
  const guest = await host(srv.url, { visibility: "public" }, false);
  const odd = await host(srv.url, { visibility: { $ne: "private" } });
  await sleep(100);

  assert.deepEqual(w.rooms(), []);
  for (const c of [priv, explicit, guest, odd])
    assert.equal(c.state.isPublic, false);
});

test("the list follows the room: join, full, start, gone", async () => {
  srv = await startServer({ accounts: fake, graceMs: 50 });
  const w = await watcher(srv.url);

  // A 2-player room leaves the list when the second player takes the last seat.
  const split = await host(srv.url, {
    visibility: "public",
    gameMode: "split-body",
  });
  assert.deepEqual(
    (await w.until((r) => r.length === 1)).map((r) => [
      r.playerCount,
      r.capacity,
    ]),
    [[1, 2]],
  );
  await join(srv.url, split.state.code, "Bia");
  await w.until((r) => r.length === 0);
  // ...and a third player is refused, as before.
  const third = await join(srv.url, split.state.code, "Caio");
  assert.ok(third.seen(type("error")));

  // A party room counts its players, and leaves the list when the game starts.
  const party = await host(srv.url, { visibility: "public" });
  await w.until((r) => r.length === 1);
  const guests: TestClient[] = [];
  for (const name of ["Bia", "Caio", "Duda"])
    guests.push(await join(srv.url, party.state.code, name));
  await w.until((r) => r[0]?.playerCount === 4);
  party.send({ type: "start-game" });
  await w.until((r) => r.length === 0);

  // A room whose only player is gone for good disappears.
  const lonely = await host(srv.url, { visibility: "public" });
  await w.until((r) => r.length === 1);
  lonely.close();
  await w.until((r) => r.length === 0);
});

test("when the host leaves, the room stays listed under the new host", async () => {
  srv = await startServer({ accounts: fake, graceMs: 50 });
  const w = await watcher(srv.url);
  const ana = await host(srv.url, { visibility: "public" });
  await join(srv.url, ana.state.code, "  Bia  ");
  await w.until((r) => r[0]?.playerCount === 2);

  ana.close();
  const [entry] = await w.until((r) => r[0]?.hostName === "Bia");
  assert.deepEqual(Object.keys(entry).sort(), [
    "capacity",
    "code",
    "gameMode",
    "hostName",
    "playerCount",
  ]);
  assert.equal(entry.playerCount, 1);
});

test("a host inside the reconnect grace period hides the room; coming back shows it again", async () => {
  srv = await startServer({ accounts: fake, graceMs: 2000 });
  const w = await watcher(srv.url);
  const ana = await host(srv.url, { visibility: "public" });
  await w.until((r) => r.length === 1);

  ana.close();
  await w.until((r) => r.length === 0);

  const back = await connect(srv.url, "back");
  back.send({ type: "rejoin", roomCode: ana.state.code, token: ana.token });
  await w.until((r) => r.length === 1);
});

test("a watcher that enters a room, unsubscribes or closes gets no more lists", async () => {
  srv = await startServer({ accounts: fake });
  const first = await host(srv.url, { visibility: "public" });
  const entering = await watcher(srv.url);
  const leaving = await watcher(srv.url);
  const dying = await watcher(srv.url);
  const staying = await watcher(srv.url);

  const joined = entering.c.wait(type("room-state"));
  entering.c.send({
    type: "join-room",
    roomCode: first.state.code,
    nickname: "Bia",
  });
  await joined;
  leaving.c.send({ type: "unwatch-rooms" });
  dying.c.ws.terminate();
  await staying.until((r) => r[0]?.playerCount === 2);

  const before = [entering, leaving].map(
    (w) => w.c.msgs.filter(type("public-rooms")).length,
  );
  // More changes: none of them reach the three that stopped watching.
  await join(srv.url, first.state.code, "Caio");
  await staying.until((r) => r[0]?.playerCount === 3);
  await sleep(50);
  assert.deepEqual(
    [entering, leaving].map(
      (w) => w.c.msgs.filter(type("public-rooms")).length,
    ),
    before,
  );
});
