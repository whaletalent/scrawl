/** Sends a key may make in any `WINDOW_MS`: under the server's 15 a second. */
export const MAX_SENDS_PER_WINDOW = 12;
const WINDOW_MS = 1000;

/**
 * Per-key throttle: the first mark of a key sends at once (leading), later
 * marks within `intervalMs` of the last send collapse into one trailing send
 * when the interval is up, so the last change is always sent. `flush()` sends
 * every pending key at once (used on pointer-up), skipping the interval.
 *
 * On top of that, no key ever sends more than `maxPerWindow` times in any
 * second, flushes included; a send over that budget waits until the window
 * allows it instead of being dropped (the server drops frames past 15/s
 * silently, which could lose the last one of a burst).
 */
export function createThrottle(
  intervalMs: number,
  send: (key: number) => void,
  maxPerWindow = MAX_SENDS_PER_WINDOW,
): { mark(key: number): void; flush(): void } {
  const sends = new Map<number, number[]>();
  const pending = new Set<number>();
  const timers = new Map<number, ReturnType<typeof setTimeout>>();

  /** Recent send times of `key`, oldest first, pruned to the window. */
  const recent = (key: number, now: number) => {
    const times = (sends.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
    sends.set(key, times);
    return times;
  };

  /** Earliest time `key` may send; `flushing` skips the interval. */
  const earliest = (key: number, now: number, flushing: boolean) => {
    const times = recent(key, now);
    let at = now;
    const last = times[times.length - 1];
    if (!flushing && last !== undefined) at = Math.max(at, last + intervalMs);
    if (times.length >= maxPerWindow)
      at = Math.max(at, times[times.length - maxPerWindow] + WINDOW_MS);
    return at;
  };

  const fire = (key: number, now: number) => {
    pending.delete(key);
    recent(key, now).push(now);
    send(key);
  };

  const arm = (key: number, at: number, now: number) => {
    const old = timers.get(key);
    if (old !== undefined) clearTimeout(old);
    timers.set(
      key,
      setTimeout(() => {
        timers.delete(key);
        if (!pending.has(key)) return;
        const t = Date.now();
        const next = earliest(key, t, false);
        if (next <= t) fire(key, t);
        else arm(key, next, t);
      }, at - now),
    );
  };

  return {
    mark(key) {
      pending.add(key);
      if (timers.has(key)) return;
      const now = Date.now();
      const at = earliest(key, now, false);
      if (at <= now) fire(key, now);
      else arm(key, at, now);
    },
    flush() {
      const now = Date.now();
      for (const key of [...pending]) {
        const at = earliest(key, now, true);
        if (at <= now) {
          const timer = timers.get(key);
          if (timer !== undefined) clearTimeout(timer);
          timers.delete(key);
          fire(key, now);
        } else {
          arm(key, at, now);
        }
      }
    },
  };
}
