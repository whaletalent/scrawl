"use client";
import { useRef, useCallback } from "react";
import type { DrawingResult } from "@/types/game";

interface ShareCardProps {
  drawing: DrawingResult;
  playerNames: [string, string];
}

export function ShareCard({ drawing, playerNames }: ShareCardProps) {
  const cardRef = useRef<HTMLCanvasElement>(null);

  const generateCard = useCallback(() => {
    const canvas = cardRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = 1080;
    canvas.height = 1080;

    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(0, 0, 1080, 1080);

    ctx.fillStyle = "#a855f7";
    ctx.font = "bold 48px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("SCRAWL", 540, 60);

    ctx.fillStyle = "#9ca3af";
    ctx.font = "24px sans-serif";
    ctx.fillText(`"${drawing.themeText}"`, 540, 110);

    const leftImg = new Image();
    const rightImg = new Image();

    leftImg.onload = () => {
      ctx.drawImage(leftImg, 40, 140, 500, 375);
      rightImg.onload = () => {
        ctx.drawImage(rightImg, 540, 140, 500, 375);

        ctx.strokeStyle = "#374151";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(540, 140);
        ctx.lineTo(540, 515);
        ctx.stroke();

        ctx.fillStyle = "#e5e7eb";
        ctx.font = "28px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(`${playerNames[0]} + ${playerNames[1]}`, 540, 570);

        const score = drawing.votes.first * 3 + drawing.votes.second * 2 + drawing.votes.third;
        ctx.fillStyle = "#a855f7";
        ctx.font = "bold 36px sans-serif";
        ctx.fillText(`${score} pts`, 540, 620);

        ctx.fillStyle = "#6b7280";
        ctx.font = "20px sans-serif";
        ctx.fillText("Play at scrawl.gg", 540, 680);
      };
      rightImg.src = drawing.imageRightDataUrl;
    };
    leftImg.src = drawing.imageLeftDataUrl;
  }, [drawing, playerNames]);

  function download() {
    generateCard();
    setTimeout(() => {
      const canvas = cardRef.current;
      if (!canvas) return;
      const link = document.createElement("a");
      link.download = `scrawl-${Date.now()}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    }, 500);
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <canvas ref={cardRef} className="hidden" />
      <button
        onClick={download}
        className="px-6 py-3 bg-purple-600 hover:bg-purple-500 rounded-xl font-bold transition-colors"
      >
        Download Share Card
      </button>
    </div>
  );
}
