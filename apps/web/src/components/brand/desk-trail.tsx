"use client";
import { useEffect, useRef } from "react";

/** How long a stretch of the trail takes to fade out. */
const LIFE_MS = 2300;
const WIDTH = 6;
/** A darker tone of the desk (#d63c17). */
const INK = "166, 40, 10";
/** Two moves further apart than this are two strokes, not one. */
const GAP_MS = 120;

interface Point {
  x: number;
  y: number;
  t: number;
  /** First point of a new stroke: nothing joins it to the one before. */
  start: boolean;
}

/**
 * A pencil trail on the desk: wherever the pointer goes, it leaves a line on
 * the orange background that fades in a couple of seconds. One transparent
 * canvas behind every page; it only shows where the desk itself shows.
 * Mouse and pen only, off under reduced motion, and idle when nothing is
 * left to fade.
 */
export function DeskTrail() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let points: Point[] = [];
    let frame = 0;
    let ratio = 1;

    const resize = () => {
      ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(window.innerWidth * ratio);
      canvas.height = Math.round(window.innerHeight * ratio);
    };

    const draw = (now: number) => {
      frame = 0;
      points = points.filter((p) => now - p.t < LIFE_MS);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      ctx.lineWidth = WIDTH;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      for (let i = 1; i < points.length; i++) {
        const to = points[i];
        if (to.start) continue;
        const from = points[i - 1];
        ctx.strokeStyle = `rgba(${INK}, ${1 - (now - to.t) / LIFE_MS})`;
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
        ctx.stroke();
      }
      if (points.length > 0) frame = requestAnimationFrame(draw);
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      const t = performance.now();
      const last = points.at(-1);
      points.push({
        x: e.clientX,
        y: e.clientY,
        t,
        start: !last || t - last.t > GAP_MS,
      });
      if (!frame) frame = requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      data-desk-trail=""
      // Behind everything on the page, over the body's own background.
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        zIndex: -1,
        pointerEvents: "none",
      }}
    />
  );
}
