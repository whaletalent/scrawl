"use client";
import { useRef, useState } from "react";
import { DrawingCanvas, type DrawingCanvasHandle } from "@/components/canvas/drawing-canvas";

interface DrawingPhaseProps {
  theme: string;
  side: "left" | "right";
  onSubmit: (imageDataUrl: string) => void;
  endsAt: number;
}

export function DrawingPhase({ theme, side, onSubmit, endsAt }: DrawingPhaseProps) {
  const canvasRef = useRef<DrawingCanvasHandle>(null);
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit() {
    if (submitted) return;
    const image = canvasRef.current?.exportImage();
    if (image) {
      onSubmit(image);
      setSubmitted(true);
    }
  }

  return (
    <div className="flex flex-col items-center gap-4 px-4 w-full">
      <div className="text-center">
        <h2 className="text-xl font-bold">Draw: {theme}</h2>
        <p className="text-gray-400 text-sm">
          You draw the {side} half. Your partner draws the other side!
        </p>
      </div>

      <DrawingCanvas ref={canvasRef} side={side} />

      {!submitted ? (
        <button
          onClick={handleSubmit}
          className="px-8 py-3 bg-green-600 hover:bg-green-500 rounded-xl font-bold text-lg transition-colors"
        >
          Submit Drawing
        </button>
      ) : (
        <p className="text-green-400 font-medium">Drawing submitted! Waiting for others...</p>
      )}
    </div>
  );
}
