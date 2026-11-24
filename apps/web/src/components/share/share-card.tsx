"use client";
import { useState } from "react";
import { DownloadSimple } from "@phosphor-icons/react";
import type { DrawingResult } from "@/types/game";
import { composePartyDrawing } from "@/lib/compose-drawing";

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

  // The brand orange, with white and cream words (see globals.css).
  ctx.fillStyle = "#d63c17";
  ctx.fillRect(0, 0, 1080, 1080);

  ctx.textAlign = "center";
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 48px sans-serif";
  ctx.fillText("SCRAWL", 540, 60);

  ctx.fillStyle = "#fff8e4";
  ctx.font = "24px sans-serif";
  ctx.fillText(`"${drawing.themeText}"`, 540, 110, 1000);

  // The picture as the screens show it: paper, strip frames, both layers.
  // A layer that never came (player left) just leaves blank paper.
  const picture = await loadImage(await composePartyDrawing(drawing));
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(40, 140, 1000, 750);
  if (picture) ctx.drawImage(picture, 40, 140, 1000, 750);

  ctx.fillStyle = "#ffffff";
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
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 36px sans-serif";
  ctx.fillText(`${score} pts`, 540, 995);

  ctx.fillStyle = "#fff8e4";
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
      aria-label="Baixar card"
      title="Baixar card"
      className="press flex-none w-12 h-12 grid place-items-center bg-white text-ink border-[3px] border-ink disabled:opacity-60"
    >
      <DownloadSimple aria-hidden="true" weight="bold" size={24} />
    </button>
  );
}
