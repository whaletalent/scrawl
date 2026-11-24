"use client";
import { useCallback, useEffect, useMemo, useRef, type RefObject } from "react";
import type { Rect } from "@/lib/seam-geometry";
import { cropStrip } from "@/lib/strip-image";
import { createThrottle } from "@/lib/throttle";

/** At most one frame per strip per this many ms (the server allows 15/s). */
export const STRIP_SEND_INTERVAL_MS = 100;

const overlaps = (a: Rect, b: Rect) =>
  a.x < b.x + b.width &&
  b.x < a.x + a.width &&
  a.y < b.y + b.height &&
  b.y < a.y + a.height;

/**
 * Sends the own layer's strips as they change. `markDirty(area)` schedules a
 * send for every strip that `area` touches (every strip when omitted);
 * `flush()` sends whatever is pending at once (call it on pointer-up).
 */
export function useStripSender(
  canvas: RefObject<HTMLCanvasElement | null>,
  strips: { index: number; rect: Rect }[],
  send: (strip: number, image: string) => void,
): { markDirty(area?: Rect | null): void; flush(): void } {
  const stripsRef = useRef(strips);
  const sendRef = useRef(send);
  useEffect(() => {
    stripsRef.current = strips;
    sendRef.current = send;
  });

  const throttle = useMemo(
    () =>
      createThrottle(STRIP_SEND_INTERVAL_MS, (index) => {
        const el = canvas.current;
        const strip = stripsRef.current.find((s) => s.index === index);
        if (!el || !strip) return;
        const image = cropStrip(el, strip.rect);
        if (image) sendRef.current(index, image);
      }),
    [canvas],
  );

  const markDirty = useCallback(
    (area?: Rect | null) => {
      for (const strip of stripsRef.current) {
        if (!area || overlaps(area, strip.rect)) throttle.mark(strip.index);
      }
    },
    [throttle],
  );

  return { markDirty, flush: throttle.flush };
}
