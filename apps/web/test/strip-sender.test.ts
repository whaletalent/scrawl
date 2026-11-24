import { test, mock } from "node:test";
import assert from "node:assert/strict";
import { createThrottle } from "../src/lib/throttle";

function setup() {
  mock.timers.enable({ apis: ["setTimeout", "Date"] });
  const sent: { key: number; at: number }[] = [];
  const throttle = createThrottle(100, (key) =>
    sent.push({ key, at: Date.now() }),
  );
  return { sent, throttle };
}

test("10 marks within 50 ms: one send now, one trailing at 100 ms", (t) => {
  t.after(() => mock.timers.reset());
  const { sent, throttle } = setup();
  for (let i = 0; i < 10; i++) {
    throttle.mark(0);
    mock.timers.tick(5);
  }
  assert.deepEqual(sent, [{ key: 0, at: 0 }]);
  mock.timers.tick(50);
  assert.deepEqual(sent, [
    { key: 0, at: 0 },
    { key: 0, at: 100 },
  ]);
  mock.timers.tick(500);
  assert.equal(sent.length, 2, "nothing more without new marks");
});

test("a single mark sends once, with no trailing send", (t) => {
  t.after(() => mock.timers.reset());
  const { sent, throttle } = setup();
  throttle.mark(0);
  mock.timers.tick(1000);
  assert.deepEqual(sent, [{ key: 0, at: 0 }]);
});

test("marks on two keys are throttled separately", (t) => {
  t.after(() => mock.timers.reset());
  const { sent, throttle } = setup();
  throttle.mark(0);
  mock.timers.tick(30);
  throttle.mark(1);
  throttle.mark(0);
  throttle.mark(1);
  assert.deepEqual(sent, [
    { key: 0, at: 0 },
    { key: 1, at: 30 },
  ]);
  mock.timers.tick(70);
  assert.deepEqual(sent.slice(2), [{ key: 0, at: 100 }]);
  mock.timers.tick(30);
  assert.deepEqual(sent.slice(3), [{ key: 1, at: 130 }]);
});

test("at most one send per interval while marks keep coming", (t) => {
  t.after(() => mock.timers.reset());
  const { sent, throttle } = setup();
  for (let i = 0; i < 100; i++) {
    throttle.mark(0);
    mock.timers.tick(10);
  }
  mock.timers.tick(200);
  const times = sent.map((s) => s.at);
  for (let i = 1; i < times.length; i++) {
    assert.ok(times[i] - times[i - 1] >= 100, `gap at ${i}: ${times}`);
  }
  // The last mark (at 990) is sent.
  assert.ok(times[times.length - 1] >= 990);
});

test("flush sends pending at once and cancels the trailing timer", (t) => {
  t.after(() => mock.timers.reset());
  const { sent, throttle } = setup();
  throttle.mark(0);
  throttle.mark(0);
  throttle.mark(1);
  throttle.mark(1);
  mock.timers.tick(20);
  throttle.flush();
  assert.deepEqual(sent, [
    { key: 0, at: 0 },
    { key: 1, at: 0 },
    { key: 0, at: 20 },
    { key: 1, at: 20 },
  ]);
  mock.timers.tick(500);
  assert.equal(sent.length, 4, "no duplicate trailing send");
});

test("flush with nothing pending sends nothing", (t) => {
  t.after(() => mock.timers.reset());
  const { sent, throttle } = setup();
  throttle.mark(0);
  throttle.flush();
  assert.equal(sent.length, 1);
});

test("a mark right after flush waits for the interval", (t) => {
  t.after(() => mock.timers.reset());
  const { sent, throttle } = setup();
  throttle.mark(0);
  mock.timers.tick(10);
  throttle.mark(0);
  throttle.flush(); // sends at 10
  throttle.mark(0);
  assert.equal(sent.length, 2);
  mock.timers.tick(100);
  assert.deepEqual(sent.slice(2), [{ key: 0, at: 110 }]);
});
