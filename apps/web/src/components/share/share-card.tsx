"use client";
import { useState } from "react";
import type { DrawingResult } from "@/types/game";

interface ShareCardProps {
  drawing: DrawingResult;
}

function loadImage(
  src: string | null | undefined,
  crossOrigin = false,
): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    if (!src) {
      resolve(null);
      return;
    }
    const img = new Image();
    // Avatars come from another origin; without CORS they would taint the canvas.
    if (crossOrigin) img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

async function renderCard(
  drawing: DrawingResult,
  withAvatars: boolean,
): Promise<string> {
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1080;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  ctx.fillStyle = "#0a0a0a";
  ctx.fillRect(0, 0, 1080, 1080);

  ctx.textAlign = "center";
  ctx.fillStyle = "#a855f7";
  ctx.font = "bold 48px sans-serif";
  ctx.fillText("SCRAWL", 540, 60);

  ctx.fillStyle = "#9ca3af";
  ctx.font = "24px sans-serif";
  ctx.fillText(`"${drawing.themeText}"`, 540, 110, 1000);

  // Each half is 400x600 — a missing half (player left or never submitted)
  // just stays as blank paper.
  const [leftImg, rightImg] = await Promise.all([
    loadImage(drawing.imageLeftDataUrl),
    loadImage(drawing.imageRightDataUrl),
  ]);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(40, 140, 1000, 750);
  if (leftImg) ctx.drawImage(leftImg, 40, 140, 500, 750);
  if (rightImg) ctx.drawImage(rightImg, 540, 140, 500, 750);

  ctx.strokeStyle = "#d1d5db";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(540, 140);
  ctx.lineTo(540, 890);
  ctx.stroke();

  ctx.fillStyle = "#e5e7eb";
  ctx.font = "28px sans-serif";
  const names = `${drawing.playerNames[0]} + ${drawing.playerNames[1]}`;
  ctx.fillText(names, 540, 945, 900);

  // Each author's avatar as a circle on their side of the names.
  if (withAvatars) {
    const half = Math.min(ctx.measureText(names).width, 900) / 2;
    const avatars = await Promise.all(
      (drawing.playerAvatars ?? []).map((url) => loadImage(url, true)),
    );
    avatars.forEach((img, i) => {
      if (!img) return;
      const cx = i === 0 ? 540 - half - 36 : 540 + half + 36;
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, 935, 22, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(img, cx - 22, 913, 44, 44);
      ctx.restore();
    });
  }

  const score =
    drawing.votes.first * 3 + drawing.votes.second * 2 + drawing.votes.third;
  ctx.fillStyle = "#a855f7";
  ctx.font = "bold 36px sans-serif";
  ctx.fillText(`${score} pts`, 540, 995);

  ctx.fillStyle = "#6b7280";
  ctx.font = "20px sans-serif";
  ctx.fillText("Jogue em scrawl.gg", 540, 1045);

  return canvas.toDataURL("image/png");
}

export function ShareCard({ drawing }: ShareCardProps) {
  const [busy, setBusy] = useState(false);

  async function download() {
    setBusy(true);
    try {
      // An avatar that can't be read back (no CORS) makes toDataURL throw:
      // the card is then drawn again with names only. The download never breaks.
      const href = await renderCard(drawing, true).catch(() =>
        renderCard(drawing, false),
      );
      if (!href) return;
      const link = document.createElement("a");
      link.download = `scrawl-${Date.now()}.png`;
      link.href = href;
      link.click();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={download}
      disabled={busy}
      className="w-full px-6 py-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-60 rounded-xl font-bold transition-colors"
    >
      Baixar card
    </button>
  );
}
