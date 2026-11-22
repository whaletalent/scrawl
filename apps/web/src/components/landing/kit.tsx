"use client";
import { useEffect } from "react";
import { BASE_PATH } from "@/lib/routes";

/**
 * The landing page is built on a small design kit that lives in
 * `public/assets/` as plain CSS and ES modules (see `public/assets/README.md`).
 * It styles bare elements (`body`, `main > section`, `h1`...), so it must only
 * be loaded while the landing is on screen: the stylesheets are rendered by
 * the landing itself (React removes them with it) and the scripts are added
 * once the page is really shown.
 */
const KIT = `${BASE_PATH}/assets`;

const STYLESHEETS = [
  "https://fonts.googleapis.com/css2?family=Gabarito:wght@400..700&family=Figtree:wght@400..600&display=swap",
  `${KIT}/system.css`,
  `${KIT}/ui/cards.css`,
  `${KIT}/motion/motion.css`,
  `${KIT}/backgrounds/backgrounds.css`,
  `${KIT}/layout/layout.css`,
  `${KIT}/icons/icon.css`,
  `${KIT}/moments/liquid-type/moment.css`,
];

/** In order: each one waits for the one before it. */
const SCRIPTS = [
  `${KIT}/system.js`,
  `${KIT}/motion/motion.js`,
  `${KIT}/layout/layout.js`,
];

/**
 * Palette and type, after the owner's reference (refs/ref2.webp): an orange
 * brand ground, cream paper, white cards and one indigo block, with Gabarito
 * set bold over Figtree. It has to come after layout.css, which resets `--ly-scale`.
 */
const TOKENS = `
:root {
  --p-bg: #fff8e4; --p-surface: #ffffff; --p-ink: #33200f; --p-muted: #75614c;
  --p-accent: #d63c17; --p-accent-ink: #ffffff; --p-action: #d63c17; --p-action-ink: #ffffff;
  --p-inv-bg: #3d2fc4; --p-inv-surface: #4b3dd6; --p-inv-ink: #ffffff; --p-inv-muted: #d5d0f7;
  --p-inv-accent: #ffb224; --p-inv-accent-ink: #33200f; --p-inv-action: #ffb224; --p-inv-action-ink: #33200f;
  --font-display: "Gabarito", system-ui, sans-serif;
  --font-text: "Figtree", system-ui, sans-serif;
  --display-weight: 700;
  --display-tracking: -0.02em;
  --display-tracking-xl: -0.025em;
  --ly-scale: 0.98;
}
`;

/**
 * Runs while the HTML is parsed, before the hero paints.
 * - A browser that holds a Supabase session is probably logged in: the
 *   landing waits (`ld-wait`) until the account is known, see landing.tsx.
 * - The hero's words wait for their entrance (motion.js) instead of flashing,
 *   and the moment's guard is armed.
 * Each has a timeout, so a script that never loads hides nothing.
 */
const BEFORE_PAINT = `
try{for(var i=0;i<localStorage.length;i++)if(/^sb-.+-auth-token$/.test(localStorage.key(i))){document.documentElement.classList.add('ld-wait');setTimeout(()=>document.documentElement.classList.remove('ld-wait'),4000);break}}catch(e){}
document.documentElement.classList.add('m-enter','mo-js');
setTimeout(()=>document.documentElement.classList.add('m-enter-done'),700);
setTimeout(()=>document.documentElement.classList.add('mo-safe'),2500);
`;

export function KitStyles({ pageCss }: { pageCss: string }) {
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link
        rel="preconnect"
        href="https://fonts.gstatic.com"
        crossOrigin="anonymous"
      />
      {STYLESHEETS.map((href) => (
        // No `precedence`: React keeps these where they are and removes them
        // when the landing unmounts.
        <link key={href} rel="stylesheet" href={href} />
      ))}
      <style>{TOKENS + pageCss}</style>
      <script dangerouslySetInnerHTML={{ __html: BEFORE_PAINT }} />
    </>
  );
}

/** Loads the kit's scripts once `active`; they find the page on their own. */
export function useKitScripts(active: boolean) {
  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    const added: HTMLScriptElement[] = [];
    const next = (i: number) => {
      if (cancelled || i >= SCRIPTS.length) return;
      const script = document.createElement("script");
      script.type = "module";
      script.src = SCRIPTS[i];
      script.onload = script.onerror = () => next(i + 1);
      added.push(script);
      document.body.append(script);
    };
    next(0);
    return () => {
      cancelled = true;
      added.forEach((s) => s.remove());
      document.documentElement.classList.remove(
        "m-enter",
        "m-enter-done",
        "mo-js",
        "mo-safe",
        "ld-wait",
      );
    };
  }, [active]);
}
