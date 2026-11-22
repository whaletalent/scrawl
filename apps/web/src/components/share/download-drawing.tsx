"use client";
import { useState } from "react";
import { DownloadSimple } from "@phosphor-icons/react";

/** Downloads a finished drawing as the same 800×600 PNG that goes to the gallery. */
export function DownloadDrawing({
  compose,
}: {
  compose: () => Promise<string>;
}) {
  const [busy, setBusy] = useState(false);

  async function download() {
    setBusy(true);
    try {
      const link = document.createElement("a");
      link.download = `scrawl-${Date.now()}.png`;
      link.href = await compose();
      link.click();
    } catch {
      // nothing to download; the button just comes back
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={download}
      disabled={busy}
      aria-label="Baixar desenho"
      title="Baixar desenho"
      className="press flex-none w-12 h-12 grid place-items-center bg-white text-ink border-[3px] border-ink disabled:opacity-60"
    >
      <DownloadSimple aria-hidden="true" weight="bold" size={24} />
    </button>
  );
}
