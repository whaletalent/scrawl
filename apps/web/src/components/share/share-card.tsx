"use client";
import { useState } from "react";
import { DownloadSimple } from "@phosphor-icons/react";
import type { DrawingResult, SeamDrawing } from "@/types/game";
import { composePartyDrawing, composeSeamDrawing } from "@/lib/compose-drawing";

/** A Racha-tema drawing (with its theme and score) or an Emenda one. */
type ShareCardProps = { drawing: DrawingResult } | { seamDrawing: SeamDrawing };

/** What goes on the card, whatever the mode. */
interface CardContent {
  /** The line under the logo: the theme in quotes, or the mode's name. */
  subtitle: string;
  compose: () => Promise<string>;
  /** The authors, left to right (two, or three in Emenda). */
  names: string[];
  avatars: (string | null | undefined)[];
  /** Racha-tema only. */
  score?: number;
}

function contentOf(props: ShareCardProps): CardContent {
  if ("seamDrawing" in props) {
    const d = props.seamDrawing;
    return {
      subtitle: "Emenda",
      compose: () => composeSeamDrawing(d),
      names: d.memberNames,
      avatars: d.memberAvatars,
    };
  }
  const d = props.drawing;
  return {
    subtitle: `"${d.themeText}"`,
    compose: () => composePartyDrawing(d),
    names: d.playerNames,
    avatars: d.playerAvatars ?? [],
    score: d.votes.first * 3 + d.votes.second * 2 + d.votes.third,
  };
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
  card: CardContent,
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
  ctx.fillText(card.subtitle, 540, 110, 1000);

  // The picture as the screens show it: paper, strip frames, every layer.
  // A layer that never came (player left) just leaves blank paper.
  const picture = await loadImage(await card.compose());
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(40, 140, 1000, 750);
  if (picture) ctx.drawImage(picture, 40, 140, 1000, 750);

  ctx.fillStyle = "#ffffff";
  ctx.font = "28px sans-serif";
  const names = card.names.join(" + ");
  ctx.fillText(names, 540, 945, 900);

  const circle = (img: HTMLImageElement, cx: number, cy: number) => {
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, 22, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(img, cx - 22, cy - 22, 44, 44);
    ctx.restore();
  };

  if (withAvatars) {
    const avatars = await Promise.all(
      card.avatars.map((url) => loadImage(url, true)),
    );
    if (avatars.length <= 2) {
      // Each author's avatar as a circle on their side of the names.
      const half = Math.min(ctx.measureText(names).width, 900) / 2;
      avatars.forEach((img, i) => {
        if (img) circle(img, i === 0 ? 540 - half - 36 : 540 + half + 36, 935);
      });
    } else {
      // A trio: the avatars in a row under the names, in the same order
      // (Emenda has no score to put there).
      avatars.forEach((img, i) => {
        if (img) circle(img, 540 + (i - (avatars.length - 1) / 2) * 60, 995);
      });
    }
  }

  if (card.score !== undefined) {
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 36px sans-serif";
    ctx.fillText(`${card.score} pts`, 540, 995);
  }

  ctx.fillStyle = "#fff8e4";
  ctx.font = "20px sans-serif";
  ctx.fillText("Jogue em scrawl.gg", 540, 1045);

  return canvas.toDataURL("image/png");
}

export function ShareCard(props: ShareCardProps) {
  const [busy, setBusy] = useState(false);

  async function download() {
    setBusy(true);
    try {
      // An avatar that can't be read back (no CORS) makes toDataURL throw:
      // the card is then drawn again with names only. The download never breaks.
      const card = contentOf(props);
      const href = await renderCard(card, true).catch(() =>
        renderCard(card, false),
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
