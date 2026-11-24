/**
 * Per-key throttle: the first mark of a key sends at once (leading), later
 * marks within `intervalMs` of the last send collapse into one trailing send
 * when the interval is up, so the last change is always sent. `flush()` sends
 * every pending key at once (used on pointer-up).
 */
export function createThrottle(
  intervalMs: number,
  send: (key: number) => void,
): { mark(key: number): void; flush(): void } {
  const lastSent = new Map<number, number>();
  const pending = new Set<number>();
  const timers = new Map<number, ReturnType<typeof setTimeout>>();

  const fire = (key: number) => {
    pending.delete(key);
    lastSent.set(key, Date.now());
    send(key);
  };

  return {
    mark(key) {
      if (timers.has(key)) {
        pending.add(key);
        return;
      }
      const last = lastSent.get(key);
      const now = Date.now();
      if (last === undefined || now - last >= intervalMs) {
        fire(key);
        return;
      }
      pending.add(key);
      timers.set(
        key,
        setTimeout(
          () => {
            timers.delete(key);
            if (pending.has(key)) fire(key);
          },
          last + intervalMs - now,
        ),
      );
    },
    flush() {
      for (const timer of timers.values()) clearTimeout(timer);
      timers.clear();
      for (const key of [...pending]) fire(key);
    },
  };
}
