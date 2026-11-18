import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { startServer } from "./server.js";
import { MAX_MESSAGE_BYTES } from "../src/app.js";
import { connect, createRoom, type, sleep, IMG } from "./client.js";

let srv: Awaited<ReturnType<typeof startServer>>;
before(async () => {
  srv = await startServer();
});
after(() => srv.stop());

test("a drawing that is not an inline PNG is ignored", async () => {
  const { clients } = await createRoom(srv.url, 2, {
    gameMode: "split-body",
    totalRounds: 1,
    turnDuration: 60,
  });
  const [host, guest] = clients;
  const started = guest.wait(type("split-round-start"));
  host.send({ type: "start-game" });
  await started;

  host.send({ type: "submit-split-drawing", imageDataUrl: IMG });
  for (const bad of [
    "javascript:alert(1)",
    "https://example.com/x.png",
    "data:text/html;base64,AAAA",
    42,
    null,
  ]) {
    guest.send({ type: "submit-split-drawing", imageDataUrl: bad });
  }
  await sleep(100);
  assert.ok(
    !host.seen(type("split-final-results")),
    "the round must still be waiting for a real drawing",
  );

  const final = host.wait(type("split-final-results"));
  guest.send({ type: "submit-split-drawing", imageDataUrl: IMG });
  const [drawing] = (await final).drawings;
  assert.equal(drawing.topImageDataUrl, IMG);
  assert.equal(drawing.bottomImageDataUrl, IMG);
});

test("malformed messages get an error and don't break the connection", async () => {
  const c = await connect(srv.url);
  const error = c.wait(type("error"));
  c.ws.send("this is not json");
  await error;

  const created = c.wait(type("room-state"));
  c.send({ type: "create-room", nickname: "ok" });
  assert.equal((await created).state.phase, "lobby");
});

test("a message over the size limit closes the connection", async () => {
  const c = await connect(srv.url);
  const closed = new Promise<number>((resolve) =>
    c.ws.on("close", (code) => resolve(code)),
  );
  c.send({ type: "create-room", nickname: "x".repeat(MAX_MESSAGE_BYTES + 1) });
  assert.equal(await closed, 1009); // "message too big"

  // ...and the server is still up for everybody else
  const other = await connect(srv.url);
  const created = other.wait(type("room-state"));
  other.send({ type: "create-room", nickname: "still here" });
  await created;
});
