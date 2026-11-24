"use client";
import { forwardRef, useImperativeHandle, useMemo } from "react";
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

/**
 * The Emenda paper. From the bottom up: white paper; in each of the
 * player's strips, the neighbour's latest frame and the player's own kept
 * frame (after a reload; it can't be erased); the dashed strip borders; the
 * other players' zones in grey; the player's own transparent layer on top.
 */
export const SeamCanvas = forwardRef<SeamCanvasHandle, SeamCanvasProps>(
  function SeamCanvas({ size, index, members, frames, onStripFrame }, ref) {
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

    const layer = useLayerCanvas(rects, {
      onChange: (area) => sender.markDirty(area),
      onStrokeEnd: () => sender.flush(),
    });
    const sender = useStripSender(layer.canvasRef, myStrips, onStripFrame);

    useImperativeHandle(ref, () => ({ exportLayer: layer.exportLayer }), [
      layer.exportLayer,
    ]);

    const ownId = members[index]?.id;
    const stripImages = myStrips.flatMap(({ index: strip, rect }) => {
      const neighbour = neighbourAcross(size, index, strip);
      const ids = [
        neighbour !== null ? members[neighbour]?.id : undefined,
        ownId,
      ];
      return ids.flatMap((id) => {
        const src = id ? frames[`${strip}:${id}`] : undefined;
        return src ? [{ key: `${strip}:${id}`, src, rect }] : [];
      });
    });

    return (
      <Toolbar
        tool={layer.tool}
        onToolChange={layer.setTool}
        onClear={layer.clear}
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
            onMouseDown={layer.startDrawing}
            onMouseMove={layer.draw}
            onMouseUp={layer.stopDrawing}
            onMouseLeave={layer.stopDrawing}
            onTouchStart={layer.startDrawing}
            onTouchMove={layer.draw}
            onTouchEnd={layer.stopDrawing}
            onTouchCancel={layer.stopDrawing}
            className="absolute inset-0 w-full h-full cursor-crosshair touch-none"
          />
        </div>
      </Toolbar>
    );
  },
);
