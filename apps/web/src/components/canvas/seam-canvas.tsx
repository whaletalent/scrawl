"use client";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { useLayerCanvas } from "@/hooks/use-layer-canvas";
import { useStripSender } from "@/hooks/use-strip-sender";
import {
  drawableRects,
  neighbourAcross,
  seamLayout,
  stripsOf,
  type Rect,
} from "@/lib/seam-geometry";
import { Toolbar } from "./toolbar";

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;

interface SeamCanvasProps {
  size: 2 | 3;
  /** This player's place in the group (left to right). */
  index: number;
  members: { id: string; nickname: string }[];
  /** Strip frames keyed "strip:playerId" (useGameState's `stripFrames`). */
  frames: Record<string, string>;
  onStripFrame(strip: number, imageDataUrl: string): void;
  /**
   * The round-start message the canvas belongs to (`pair-assigned` /
   * `seam-round-start`). A new one while mounted is a resync after a socket
   * blip: frames sent while the socket was down were dropped, so every own
   * strip is sent again.
   */
  resync?: unknown;
  /** The layer is sent: no more drawing, no more strip frames. */
  disabled?: boolean;
}

export interface SeamCanvasHandle {
  /** The player's whole layer: a transparent 800×600 PNG. */
  exportLayer(): string;
}

/** Percent box of a logical rect, for absolutely placed layers. */
const place = (r: Rect): React.CSSProperties => ({
  left: `${(r.x / CANVAS_WIDTH) * 100}%`,
  top: `${(r.y / CANVAS_HEIGHT) * 100}%`,
  width: `${(r.width / CANVAS_WIDTH) * 100}%`,
  height: `${(r.height / CANVAS_HEIGHT) * 100}%`,
});

const sameFrames = (a: Record<number, string>, b: Record<number, string>) => {
  const keys = Object.keys(a);
  return (
    keys.length === Object.keys(b).length && keys.every((k) => a[+k] === b[+k])
  );
};

/**
 * The Emenda paper. From the bottom up: white paper; in each of the
 * player's strips, the neighbour's latest frame and the player's own kept
 * frame (after a reload; it can't be erased, and every frame sent for the
 * strip is drawn over it so the neighbour keeps seeing it); the dashed strip
 * borders; the other players' zones and strips in grey; the player's own
 * transparent layer on top.
 */
export const SeamCanvas = forwardRef<SeamCanvasHandle, SeamCanvasProps>(
  function SeamCanvas(
    { size, index, members, frames, onStripFrame, resync, disabled = false },
    ref,
  ) {
    const { zones } = seamLayout(size);
    const rects = useMemo(() => drawableRects(size, index), [size, index]);
    const myStrips = useMemo(
      () =>
        stripsOf(size, index).map((s) => ({
          index: s,
          rect: seamLayout(size).strips[s],
        })),
      [size, index],
    );

    // The player's own frames the server kept, from before a reload. They
    // count only while the layer is untouched since mount: once the player
    // has drawn, the layer holds their strokes, and a later resync (a socket
    // blip) sends back frames that would only duplicate them, so the eraser
    // could no longer clear the strip.
    const ownId = members[index]?.id;
    const ownFrames = useMemo(() => {
      const srcs: Record<number, string> = {};
      for (const { index: strip } of myStrips) {
        const src = ownId ? frames[`${strip}:${ownId}`] : undefined;
        if (src) srcs[strip] = src;
      }
      return srcs;
    }, [frames, ownId, myStrips]);
    const [touched, setTouched] = useState(false);
    const touchedRef = useRef(false);
    const [kept, setKept] = useState<Record<number, string>>({});
    if (!touched && !sameFrames(kept, ownFrames)) setKept(ownFrames);

    const layer = useLayerCanvas(rects, {
      onChange: (area) => {
        if (!touchedRef.current) {
          touchedRef.current = true;
          setTouched(true);
        }
        sender.markDirty(area);
      },
      onStrokeEnd: () => sender.flush(),
    });

    // Decoded, so every frame sent for a strip is drawn over them.
    const keptSrcs = useRef<Record<number, string>>({});
    const keptImages = useRef(new Map<string, HTMLImageElement>());
    useEffect(() => {
      for (const src of Object.values(kept)) {
        if (keptImages.current.has(src)) continue;
        const img = new Image();
        img.src = src;
        keptImages.current.set(src, img);
      }
      keptSrcs.current = kept;
    }, [kept]);
    const keptFrame = useCallback((strip: number) => {
      const src = keptSrcs.current[strip];
      const img = src ? keptImages.current.get(src) : undefined;
      return img && img.complete && img.naturalWidth > 0 ? img : null;
    }, []);

    // After the layer is sent, strip strokes would count where zone strokes
    // don't: nothing more goes out, not even a send already scheduled.
    const disabledRef = useRef(disabled);
    useEffect(() => {
      disabledRef.current = disabled;
    });
    const sendFrame = useCallback(
      (strip: number, image: string) => {
        if (!disabledRef.current) onStripFrame(strip, image);
      },
      [onStripFrame],
    );

    const sender = useStripSender(
      layer.canvasRef,
      myStrips,
      sendFrame,
      keptFrame,
    );

    // A resync reaching a canvas the player has drawn on: send it all again.
    // (Own kept frames are not re-adopted: the layer already holds them.)
    const { markDirty } = sender;
    useEffect(() => {
      if (touchedRef.current) markDirty(null);
    }, [resync, markDirty]);

    useImperativeHandle(ref, () => ({ exportLayer: layer.exportLayer }), [
      layer.exportLayer,
    ]);

    const stripImages = myStrips.flatMap(({ index: strip, rect }) => {
      const images: { key: string; src: string; rect: Rect }[] = [];
      const neighbour = neighbourAcross(size, index, strip);
      const neighbourId = neighbour !== null ? members[neighbour]?.id : null;
      const theirs = neighbourId ? frames[`${strip}:${neighbourId}`] : null;
      if (theirs) images.push({ key: `n${strip}`, src: theirs, rect });
      if (kept[strip])
        images.push({ key: `k${strip}`, src: kept[strip], rect });
      return images;
    });
    // In a trio, the strip between the other two players is off-limits too.
    const otherStrips = seamLayout(size).strips.filter(
      (_, strip) => !myStrips.some((s) => s.index === strip),
    );

    return (
      <Toolbar
        tool={layer.tool}
        onToolChange={layer.setTool}
        onClear={disabled ? () => {} : layer.clear}
      >
        <div
          className="relative w-full bg-white border-2 border-line-strong overflow-hidden select-none"
          style={{ aspectRatio: `${CANVAS_WIDTH} / ${CANVAS_HEIGHT}` }}
        >
          {stripImages.map(({ key, src, rect }) => (
            <img
              key={key}
              src={src}
              alt=""
              draggable={false}
              className="absolute pointer-events-none"
              style={place(rect)}
            />
          ))}

          {myStrips.map(({ index: strip, rect }) => (
            <div
              key={strip}
              aria-hidden="true"
              className="absolute border-x-2 border-dashed border-line-strong pointer-events-none"
              style={place(rect)}
            />
          ))}

          {otherStrips.map((rect) => (
            <div
              key={rect.x}
              aria-hidden="true"
              className="partner-area absolute pointer-events-none"
              style={place(rect)}
            />
          ))}

          {zones.map((zone, member) =>
            member === index ? null : (
              <div
                key={member}
                className="partner-area absolute pointer-events-none flex items-center justify-center p-2"
                style={place(zone)}
              >
                <span className="font-display font-bold text-sm sm:text-lg text-muted text-center break-words min-w-0">
                  Área de {members[member]?.nickname ?? "parceiro"}
                </span>
              </div>
            ),
          )}

          <canvas
            ref={layer.canvasRef}
            onMouseDown={disabled ? undefined : layer.startDrawing}
            onMouseMove={disabled ? undefined : layer.draw}
            onMouseUp={layer.stopDrawing}
            onMouseLeave={layer.stopDrawing}
            onTouchStart={disabled ? undefined : layer.startDrawing}
            onTouchMove={disabled ? undefined : layer.draw}
            onTouchEnd={layer.stopDrawing}
            onTouchCancel={layer.stopDrawing}
            className={`absolute inset-0 w-full h-full touch-none ${
              disabled ? "cursor-not-allowed" : "cursor-crosshair"
            }`}
          />
        </div>
      </Toolbar>
    );
  },
);
