"use client";
import { useEffect } from "react";
import { BASE_PATH } from "@/lib/routes";
import { KitStyles, useKitScripts } from "./kit";
import { PlayForm } from "./play-form";
import CircularGallery from "@/components/react-bits/CircularGallery";
import DriftWall from "@/components/react-bits/DriftWall";

/*
  type: software (site-kind gaming)
  deal: hero photo, nav nav-cards, close close-type, footer footer-dark,
        rhythm space, buttons solid, mark arc; palette from the owner's
        reference images (cream, brown ink, orange; mint key art), radius
        round, type Gabarito + Figtree
  moments: liquid-type on the hero's headline and on the statement (#lenda)
  The page is a stack of screens: the hero alone on the first, every other
  section and the footer exactly one, its h2 first. Every picture is the
  game's own output: `scripts/landing-art/` plays real matches to make them.
*/

const IMG = `${BASE_PATH}/landing`;
/** Plain links: leaving the landing is always a full page load (see kit.tsx). */
const LOGIN = `${BASE_PATH}/login/`;
const GALLERY = `${BASE_PATH}/gallery/`;

const MODES = [
  {
    id: "party",
    noteHeight: 527,
    name: "Racha-tema",
    players: "De 4 a 10 jogadores",
    count: "4–10",
    text: "Cada um escreve um tema, as duplas são sorteadas a cada rodada e a sala vota nos desenhos.",
    note: "Um gato laranja desenhado no modo Racha-tema, num papel de recado",
    thumb: "drawing-party-1",
    thumbAlt: "Desenho de uma dupla no modo Racha-tema",
  },
  {
    id: "face-builder",
    noteHeight: 503,
    name: "Caricatura a dois",
    players: "2 jogadores",
    count: "2",
    text: "As seis partes de um rosto são sorteadas, três para cada um: cabelo, olhos, nariz, boca, orelhas e ombros.",
    note: "Um rosto montado por dois jogadores no modo Caricatura a dois, num papel de recado",
    thumb: "drawing-face-1",
    thumbAlt: "Rosto desenhado por dois jogadores no modo Caricatura a dois",
  },
  {
    id: "split-body",
    noteHeight: 435,
    name: "Monstrinho",
    players: "2 jogadores",
    count: "2",
    text: "Um desenha a cabeça e o tronco, o outro as pernas, por cima da mesma silhueta. Depois vocês trocam.",
    note: "Um pirata desenhado a quatro mãos no modo Monstrinho, num papel de recado",
    thumb: "drawing-split-1",
    thumbAlt: "Personagem desenhado por dois jogadores no modo Monstrinho",
  },
];

const ROUND = [
  {
    name: "Tema",
    text: "Cada jogador escreve um tema e as duplas são sorteadas.",
  },
  {
    name: "Desenho",
    text: "As duplas dividem o papel, um lado para cada jogador.",
  },
  {
    name: "Voto",
    text: "A sala vê os desenhos e escolhe os melhores.",
  },
  {
    name: "Placar",
    text: "Os pontos somam a cada rodada. A última rodada vale em dobro.",
  },
];

/**
 * The carousel of finished drawings, each on its result card
 * (scripts/landing-art/cards.ts draws them).
 */
const LEGENDS = [
  ["card-party-1", "Rodada 1: “gato astronauta”, de Caio e Bia"],
  ["card-split-1", "Monstrinho: “pirata com pernas de galinha”, de Bia e Léo"],
  ["card-party-2", "Rodada 2: “pizza com pernas”, de Ana e Duda"],
  [
    "card-face-1",
    "Caricatura a dois: “sujeito de nariz de palhaço”, de Bia e Léo",
  ],
  ["card-party-3", "Rodada 3: “dinossauro de patins”, de Léo e Rafa"],
  ["card-split-2", "Monstrinho: “robô com cauda de sereia”, de Bia e Léo"],
  ["card-party-4", "Rodada 1: “polvo garçom”, de Bia e Rafa"],
  ["card-face-2", "Caricatura a dois: “monstro de um olho só”, de Bia e Léo"],
  ["card-party-5", "Rodada 2: “tubarão de bicicleta”, de Caio e Duda"],
  ["card-split-6", "Monstrinho: “urso de suéter com foguete”, de Bia e Léo"],
  ["card-party-6", "Rodada 3: “cacto cabeleireiro”, de Léo e Ana"],
  ["card-face-4", "Caricatura a dois: “diva de cabelão”, de Bia e Léo"],
].map(([file, alt]) => ({ image: `${IMG}/${file}.webp`, alt }));

/** Every finished drawing, drifting on the gallery's wall. */
const WALL = [
  ...[1, 2, 3, 4, 5, 6].flatMap((n) => [
    `drawing-party-${n}`,
    `drawing-split-${n}`,
    ...(n <= 4 ? [`drawing-face-${n}`] : []),
  ]),
].map((file) => ({ image: `${IMG}/${file}-sm.webp` }));

/*
  Page CSS: the drawing desk (the same look as the game screens, see
  globals.css) laid over the kit: the desk, the bar, the hero's art, each
  section as a sheet of paper as tall as its content, and the page's motion. The kit already moves the hero's
  words on load, every hover and press, and the big headline in #lenda; added
  here, each once:
  - the hero's crew arrives, then floats 10px up and down, slowly; the flyer
    above the headline sways on its own small arc;
  - a step of the play form (options, room code) fades up as it replaces the
    last one, and a field's error fades in.
  Reduced motion keeps the fades and drops every movement.
*/
const PAGE_CSS = `
html.ld-wait body > :is(header, main, footer) { visibility: hidden; }

/* THE DESK: orange, with a faint cutting-mat grid; paper has square corners */
body { background-color: var(--p-accent); background-image: linear-gradient(rgb(255 255 255 / .07) 1px, transparent 1px), linear-gradient(90deg, rgb(255 255 255 / .07) 1px, transparent 1px); background-size: 40px 40px; }
html[data-radius] { --r-sm: 0px; --r-md: 0px; --r-lg: 0px; --r-btn: 0px; }
html[data-radius] .card { --c-r: 0px; }
html[data-radius] .panel { --p-r: 0px; }
.btn { box-shadow: 5px 5px 0 rgb(51 32 15 / .28); font-family: var(--font-display); font-weight: 700; }

/* the bar lies on the desk: white words, the page links on one darker tab */
header.nav { --bg: var(--p-accent); --ink: #ffffff; --muted: #ffffff; --line: transparent; --line-strong: rgb(255 255 255 / .5); --accent: #ffffff; --action: var(--p-bg); --action-ink: var(--p-ink); }
header.nav .nav__menu, header.nav.is-open { --bg: var(--p-bg); --ink: var(--p-ink); --muted: var(--p-muted); --action: var(--p-action); --action-ink: var(--p-action-ink); --line: color-mix(in oklab, var(--p-ink) 11%, transparent); }
.nav__logo { font-weight: 800; }
/* at the top of the page the bar has no ground of its own: the desk shows through it */
header.nav { transition: background-color 200ms var(--ease); }
header.nav.nav--top:not(.is-open) { background-color: transparent; }
.nav__logo .logo-mark { flex: none; width: 36px; height: 36px; max-width: none; margin-right: var(--s-2); border-radius: 28%; }
.menu-card .panel { --ratio: 75%; }
@media (min-width: 1024px) {
  header.nav .nav__links { flex: none; height: 44px; align-self: center; margin-right: auto; margin-left: var(--s-6); padding: 0 var(--s-2); background: rgb(0 0 0 / .16); }
}

/* THE HERO: straight on the desk. The flyer and the words on the left, the crew on the right */
.hero--photo { background: none; }
.hero-art { overflow: visible; background: none; color: rgb(255 255 255 / .2); }
.hero-art__doodles { position: absolute; inset: 0; width: 100%; height: 100%; }
.hero-art__crew { position: absolute; right: 1vw; top: 50%; width: 50vw; max-width: none; height: auto; margin-top: -12vw; }
.hero-flyer { display: block; width: clamp(170px, 15vw, 240px); height: auto; margin-bottom: var(--s-3); }
.hero--photo .btn-row { --action: var(--p-bg); --action-ink: var(--p-ink); }
@media (max-width: 1023px) {
  /* the kit moves the words under the picture, onto the page ground: here they stay on the desk, in white */
  .hero.hero--photo[data-tone] { background: none; color: #fff; --ink: #fff; --muted: #fff; }
  /* the crew fits whole in the band over the words, whatever the phone's shape */
  .hero-art__crew { left: 5vw; right: 5vw; top: 16px; bottom: 16px; width: calc(100% - 10vw); height: calc(100% - 32px); margin: 0; object-fit: contain; }
  .hero-flyer { display: none; }
}

/* THE SECTIONS lie on the desk as they are, as tall as what they hold.
   Nothing on the page casts a shadow; papers and cards have round corners. */
main#top > section.section, footer.closing { height: auto; min-height: 0; padding-block: var(--s-7); }
footer.closing { margin-top: var(--s-8); padding-block: var(--s-9) var(--s-6); }
footer.closing > .wrap { height: auto; display: grid; gap: var(--s-9); }
.ld-sr { position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }
.desk-title { color: #fff; font-size: clamp(40px, 5vw, 72px); line-height: 1; margin: 0; }

/* MODES: three coloured cards, the middle one on top and higher, the two
   others tucked under it and turned a little. Each has its toy over the top
   edge and a drawing on a sticky note hanging off the bottom one. */
.modes { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); align-items: start; margin-top: 120px; padding-bottom: 96px; }
.mode { --ink: var(--p-ink); --muted: var(--p-muted); position: relative; display: flex; flex-direction: column; align-items: center; text-align: center; gap: var(--s-3); padding: 96px clamp(20px, 2.6vw, 40px) 0; border-radius: 44px; color: var(--ink); }
.mode h3 { margin: 0; color: var(--ink); font-size: clamp(26px, 2.3vw, 34px); line-height: 1.1; }
.mode__text { margin: 0; max-width: 30ch; color: var(--ink); font-size: var(--t-small); line-height: 1.5; }
.mode--party { --ink: #fff; background: var(--p-action); margin-top: 64px; margin-right: -32px; padding-right: calc(clamp(20px, 2.6vw, 40px) + 32px); transform: rotate(-3deg); }
.mode--face-builder { background: var(--p-bg); z-index: 1; }
.mode--split-body { background: var(--p-inv-accent); margin-top: 64px; margin-left: -32px; padding-left: calc(clamp(20px, 2.6vw, 40px) + 32px); transform: rotate(3deg); }
.mode__toy { position: absolute; top: -78px; left: 50%; width: 150px; height: 150px; margin-left: -75px; object-fit: contain; }
.mode--party .mode__toy { margin-left: calc(-75px - 16px); }
.mode--split-body .mode__toy { margin-left: calc(-75px + 16px); }
.mode__players { display: inline-flex; align-items: center; gap: 6px; margin: 0; padding: 5px 14px 5px 8px; border-radius: 999px; font: 700 15px/1 var(--font-display); }
.mode__players svg { width: 20px; height: 20px; }
.mode--party .mode__players { background: var(--p-inv-accent); color: var(--p-ink); }
.mode--face-builder .mode__players { background: var(--p-accent); color: #fff; }
.mode--split-body .mode__players { background: var(--p-action); color: #fff; }
.mode__note { display: block; width: 82%; height: auto; margin: var(--s-6) 0 -96px; transform: rotate(2deg); }
.mode--party .mode__note { transform: rotate(4deg); }
.mode--split-body .mode__note { transform: rotate(-3deg); }
@media (max-width: 899px) {
  .modes { grid-template-columns: minmax(0, 1fr); max-width: 460px; margin-inline: auto; row-gap: 200px; margin-top: 110px; padding-bottom: 110px; }
  .mode, .mode--party, .mode--split-body { margin: 0; padding-inline: clamp(20px, 6vw, 36px); transform: none; }
  .mode--party .mode__toy, .mode--split-body .mode__toy { margin-left: -75px; }
  .mode__note { width: 72%; }
}

/* ONE ROUND: a paper folder, its title on the tab; the robot sits on the
   folder's edge, beside the tab. The phases are coloured cards, each with
   its number on a scrap of paper. */
.folder { margin-top: 0; }
/* the modes run straight into the round, and the legend into the gallery */
main#top > #modos { padding-bottom: 0; }
main#top > #rodada { padding-top: 0; }
main#top > #lenda { margin-bottom: 0; }
main#top > #galeria { margin-top: 0; }
.folder__top { display: flex; align-items: flex-end; justify-content: space-between; gap: var(--s-5); }
.folder__tab { position: relative; display: inline-block; max-width: calc(100% - 40px); padding: 28px clamp(24px, 4vw, 48px) 8px; background: var(--p-bg); border-radius: 40px 40px 0 0; }
.folder__tab::after { content: ""; position: absolute; left: 100%; bottom: 0; width: 40px; height: 40px; background: radial-gradient(circle at 100% 0, transparent 39.5px, var(--p-bg) 40px); }
.folder__tab h2 { margin: 0; font-size: clamp(28px, 3.4vw, 44px); line-height: 1.1; }
.folder__body { position: relative; padding: var(--s-5) clamp(24px, 4vw, 48px) clamp(32px, 4vw, 56px); background: var(--p-bg); border-radius: 0 40px 40px 40px; }
.folder__toy { flex: none; width: clamp(140px, 14vw, 200px); height: auto; margin: 0 9% -10px 0; }
.folder__lead { margin: 0; max-width: 60ch; }
.phases { list-style: none; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: var(--s-8) var(--s-6); margin: 72px 0 0; padding: 0; }
.phase { --ink: #fff; position: relative; padding: 52px 22px 26px; border-radius: 28px; background: var(--p-action); color: #fff; }
.phase:nth-child(even) { background: var(--p-accent); }
.phase__n { position: absolute; top: -32px; left: 50%; display: grid; place-items: center; width: 62px; height: 60px; margin-left: -31px; padding-top: 6px; box-sizing: border-box; background: url(${IMG}/step-note.svg) center / contain no-repeat; color: var(--p-action); font: 800 34px/1 var(--font-display); transform: rotate(-4deg); }
.phase:nth-child(even) .phase__n { color: var(--p-accent); transform: rotate(3deg); }
.phase h3 { margin: 0 0 var(--s-3); color: #fff; text-align: center; font-size: 24px; }
.phase p { margin: 0; color: #fff; line-height: 1.5; }
@media (max-width: 1023px) { .phases { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 639px) {
  /* the tab is as wide as the phone: the robot stands above it instead */
  .folder { margin-top: 0; }
  .folder__top { flex-direction: column-reverse; align-items: stretch; gap: 0; }
  /* one piece: the tab as wide as the folder, no step beside it */
  .folder__tab { align-self: stretch; max-width: none; border-radius: 28px 28px 0 0; }
  .folder__tab::after { display: none; }
  .folder__body { border-radius: 0 0 28px 28px; }
  .folder__toy { align-self: flex-end; width: 120px; margin: 0 4% -6px 0; }
  .phases { grid-template-columns: minmax(0, 1fr); row-gap: 56px; }
}

/* THE BANDS: the last two sections run from edge to edge, off the desk */
main#top > section.band { position: relative; margin-block: var(--s-8); padding-block: clamp(56px, 8vw, 112px); overflow: hidden; }
.band .btn { box-shadow: none; }

/* the legend: indigo, a giant line, the trophy; then the cards on their arc */
main#top > #lenda { background: var(--p-inv-bg); padding-bottom: 0; }
main#top .lenda-head { position: relative; display: flex; flex-direction: row; align-items: flex-start; justify-content: space-between; gap: var(--s-6); }
#lenda h2 { max-width: 9ch; margin: 0 0 var(--s-5); color: #fff; font-size: clamp(56px, 9vw, 136px); line-height: 0.95; }
#lenda .section-head p { max-width: 44ch; color: #fff; }
.trophy { flex: none; width: clamp(160px, 22vw, 300px); height: auto; margin-right: 4vw; }
.lenda-carousel { height: clamp(420px, 40vw, 580px); margin-top: calc(-1 * var(--s-6)); }
@media (max-width: 639px) {
  main#top .lenda-head { flex-direction: column-reverse; gap: 0; }
  .trophy { align-self: flex-end; width: 120px; margin: 0 0 -24px; }
  .lenda-carousel { height: 420px; }
}

/* the gallery: the drawings drift on a dark wall behind the words */
main#top > #galeria { min-height: clamp(560px, 52vw, 720px); justify-content: center; background: #1c1630; }
.galeria-wall { position: absolute; inset: 0; }
.galeria-wall .drift-wall__plane { cursor: default; }
#galeria::after { content: ""; position: absolute; inset: 0; background: linear-gradient(90deg, rgb(28 22 48 / .85) 0%, rgb(28 22 48 / .45) 45%, transparent 75%); pointer-events: none; }
main#top .galeria-front { position: relative; z-index: 1; display: flex; flex-direction: row; align-items: center; justify-content: space-between; gap: var(--s-6); pointer-events: none; }
.galeria-text { max-width: 34rem; }
.galeria-text a { pointer-events: auto; margin-top: var(--s-5); --action: var(--p-inv-accent); --action-ink: var(--p-ink); }
#galeria h2 { margin: 0 0 var(--s-5); color: #fff; font-size: clamp(48px, 7vw, 104px); line-height: 0.98; }
#galeria p { color: #fff; }
.galeria-head { flex: none; width: clamp(140px, 18vw, 240px); height: auto; margin-right: 6vw; }
@media (max-width: 639px) {
  main#top .galeria-front { flex-direction: column-reverse; align-items: flex-start; }
  .galeria-head { width: 120px; margin: 0; }
}

/* PLAY: one cream panel with round corners; the form on a deeper paper */
#jogar > .wrap { padding: clamp(24px, 4vw, 56px); background: var(--p-bg); border-radius: 40px; }
.play-col .frame { --ratio: 89.06%; max-width: 440px; }
.frame--photo { background: none; border: 0; box-shadow: none; }

/* the play form: a darker sheet of its own */
.play { background: #f0e7cf; padding: var(--s-7); border-radius: 28px; }
.play .field > span { font-size: var(--t-small); font-weight: 500; }
.play-col { display: grid; gap: var(--s-6); }
.play__code { text-transform: uppercase; letter-spacing: 0.2em; }
.opt { display: flex; flex-wrap: wrap; gap: var(--s-2); }
.opt button { min-width: 44px; height: 44px; padding: 0 var(--s-4); border: 2px solid var(--p-ink); background: var(--p-bg); color: var(--ink); font: 700 var(--t-small)/1 var(--font-display); cursor: pointer; }
.opt button[aria-pressed="true"] { background: var(--p-action); border-color: var(--p-action); color: #fff; }
.opt--swatch button { width: 44px; padding: 0; border-radius: 999px; border-width: 2px; }
.opt--swatch button[aria-pressed="true"] { border-color: var(--ink); outline: 3px solid var(--p-action); outline-offset: 2px; }

/* MOTION (see the note above PAGE_CSS) */
@media (prefers-reduced-motion: no-preference) {
  .hero-art__crew { animation: sheet-in 700ms var(--m-ease-enter) both, sheet-float 7s ease-in-out 0.7s infinite alternate; }
  .hero-flyer { animation: flyer-float 5s ease-in-out infinite alternate; }
  .play .step { transition: opacity 200ms var(--ease), transform 200ms var(--ease); }
  @starting-style { .play .step { opacity: 0; transform: translateY(8px); } }
}
@media (prefers-reduced-motion: reduce) {
  .hero-art__crew { animation: sheet-fade 600ms var(--m-ease-enter) both; }
  .play .step { transition: opacity 200ms var(--ease); }
  @starting-style { .play .step { opacity: 0; } }
}
.play .field__error { transition: opacity 150ms var(--ease); }
@starting-style { .play .field__error { opacity: 0; } }
@keyframes sheet-in { from { opacity: 0; transform: translateY(24px) scale(0.96); } }
@keyframes sheet-fade { from { opacity: 0; } }
@keyframes flyer-float { from { transform: translate(0, 6px) rotate(-3deg); } to { transform: translate(8px, -6px) rotate(3deg); } }
@keyframes sheet-float { from { transform: translateY(-10px); } to { transform: translateY(10px); } }

@media (max-width: 1023px) {
  .play { padding: var(--s-5); }
}
@media (min-width: 640px) and (max-width: 1023px) {
  #jogar .rows { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); column-gap: var(--gutter); }
  #jogar .rows > li:first-child { padding-top: var(--s-4); }
}
@media (max-width: 639px) {
  /* on a phone the second hero action is a text link: white, on the desk */
  .hero--photo .btn-row { --ink: #fff; --line-strong: rgb(255 255 255 / .6); }
  /* the text-link button casts no shadow */
  .btn--secondary { box-shadow: none; }
  #jogar > .wrap { border-radius: 28px; }
}
`;

/** Line doodles on the hero's ground: stars, a planet, a pencil squiggle. */
function Doodles() {
  return (
    <svg
      className="hero-art__doodles"
      viewBox="0 0 1440 900"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      >
        <circle cx="610" cy="150" r="54" />
        <path d="M530 172c40 34 130 12 164-36" />
        <circle cx="96" cy="760" r="30" />
        <path d="M330 118l8 22 22 8-22 8-8 22-8-22-22-8 22-8z" />
        <path d="M560 700l6 16 16 6-16 6-6 16-6-16-16-6 16-6z" />
        <path d="M118 190l5 13 13 5-13 5-5 13-5-13-13-5 13-5z" />
        <path d="M250 800c30-26 50 22 80-4s50 22 80-4 50 22 80-4" />
        <circle cx="660" cy="430" r="12" />
        <circle cx="420" cy="250" r="8" />
      </g>
    </svg>
  );
}

function Arrow() {
  return (
    <svg className="m-arrow" viewBox="0 0 12 12" aria-hidden="true">
      <path className="m-arrow__stem" d="M1 6h8" />
      <path className="m-arrow__head" d="M4.5 2.5 8 6l-3.5 3.5" />
    </svg>
  );
}

/** The players pill's face (Phosphor's Smiley, fill). */
function Smiley() {
  return (
    <svg viewBox="0 0 256 256" aria-hidden="true">
      <path
        fill="currentColor"
        d="M128 24a104 104 0 1 0 104 104A104.11 104.11 0 0 0 128 24Zm36 72a12 12 0 1 1-12 12 12 12 0 0 1 12-12Zm-72 0a12 12 0 1 1-12 12 12 12 0 0 1 12-12Zm84.92 64c-10.29 17.79-27.39 28-46.92 28s-36.63-10.2-46.92-28a8 8 0 1 1 13.84-8c7.47 12.91 19.21 20 33.08 20s25.61-7.1 33.08-20a8 8 0 1 1 13.84 8Z"
      />
    </svg>
  );
}

function Logo() {
  return (
    <a className="nav__logo" href="#top">
      <img
        className="logo-mark"
        src={`${IMG}/logo.webp`}
        alt=""
        width={192}
        height={192}
      />
      Scrawl
    </a>
  );
}

/**
 * The landing page for everyone who isn't logged in.
 * `pending`: the session isn't known yet. The page is in the HTML and shows
 * at once, except in a browser that holds a session: there it waits, so a
 * logged-in player never sees it flash before the home.
 */
export function Landing({
  signInLink = false,
  gallery = false,
  pending = false,
}: {
  /** Accounts are on: offer "Entrar / Criar conta". */
  signInLink?: boolean;
  /** Accounts are on, so the public gallery exists. */
  gallery?: boolean;
  pending?: boolean;
}) {
  useKitScripts(!pending);
  // The page is visible in the HTML itself (no script needed to read it). A
  // script in <KitStyles> hides it only for a browser that holds a session.
  useEffect(() => {
    if (!pending) document.documentElement.classList.remove("ld-wait");
  }, [pending]);
  // The bar is see-through while the page is at its top. The class is set on
  // the element, not through React: the kit's script adds its own (is-open).
  useEffect(() => {
    const bar = document.querySelector("header.nav");
    if (!bar) return;
    const check = () => bar.classList.toggle("nav--top", window.scrollY < 8);
    check();
    window.addEventListener("scroll", check, { passive: true });
    return () => window.removeEventListener("scroll", check);
  }, []);

  return (
    <>
      <KitStyles pageCss={PAGE_CSS} />

      <header className="nav nav--top">
        <div className="wrap nav__bar">
          <a className="skip-link" href="#top">
            Pular para o conteúdo
          </a>
          <Logo />
          <nav className="nav__links" aria-label="Principal">
            <div className="nav__item">
              <a className="nav__link" href="#modos">
                Modos{" "}
                <svg className="chev" viewBox="0 0 12 12" aria-hidden="true">
                  <path
                    d="M3 4.5l3 3 3-3"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </a>
              <div className="nav__menu">
                <div className="wrap grid">
                  {MODES.map((m) => (
                    <a
                      key={m.id}
                      className="menu-card span-4"
                      href={`#${m.id}`}
                    >
                      <div className="panel">
                        <img
                          className="frame__img"
                          src={`${IMG}/${m.thumb}.webp`}
                          srcSet={`${IMG}/${m.thumb}-sm.webp 400w, ${IMG}/${m.thumb}.webp 800w`}
                          sizes="(min-width: 640px) 30vw, 100vw"
                          alt={m.thumbAlt}
                          width={800}
                          height={600}
                          loading="lazy"
                          data-source="client"
                          data-subject="a drawing made in the game"
                        />
                      </div>
                      <span className="t-card">{m.name}</span>
                      <span className="t-small muted">{m.players}</span>
                    </a>
                  ))}
                </div>
              </div>
            </div>
            <div className="nav__item">
              <a className="nav__link" href="#rodada">
                Rodada
              </a>
            </div>
            <div className="nav__item">
              <a className="nav__link" href="#galeria">
                Galeria
              </a>
            </div>
          </nav>
          <div className="nav__actions">
            {signInLink && (
              <a className="nav__link" href={LOGIN}>
                Entrar / Criar conta
              </a>
            )}
            <a className="btn btn--primary" href="#jogar">
              Criar sala
            </a>
          </div>
          <button
            className="nav__toggle"
            type="button"
            aria-expanded="false"
            aria-label="Menu"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
              <path
                d="M2 5h14M2 13h14"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      </header>

      <main id="top">
        {/* HERO (photo): the brand's orange ground; the words on its left, and
            on its right the mascots on their pencil rocket, which arrive on
            load and then float. */}
        <section
          className="hero hero--photo"
          data-enter=""
          data-calm="left"
          data-box="none"
          data-tone="dark"
          aria-labelledby="hero-h"
        >
          <div className="hero__bg hero-art">
            <Doodles />
            <img
              className="hero-art__crew"
              src={`${IMG}/mascot-rocket.webp`}
              srcSet={`${IMG}/mascot-rocket-sm.webp 700w, ${IMG}/mascot-rocket.webp 1400w`}
              sizes="(min-width: 1024px) 54vw, 92vw"
              alt="Cinco robozinhos coloridos montados num lápis em forma de foguete"
              width={1400}
              height={787}
              fetchPriority="high"
              data-source="client"
              data-subject="the game's mascots"
            />
          </div>
          <div className="wrap">
            <div className="hero-text">
              <div className="hero__text">
                <img
                  className="hero-flyer"
                  src={`${IMG}/mascot-flyer-sm.webp`}
                  alt=""
                  width={300}
                  height={227}
                  data-source="client"
                  data-subject="the game's mascot"
                />
                <h1 id="hero-h" data-moment="liquid-type">
                  Scrawl, party game de desenho
                </h1>
                <p className="hero__lead">
                  Crie uma sala, mande o link e desenhe em dupla, cada um numa
                  metade do papel. De 2 a 10 jogadores.
                </p>
                <div className="btn-row">
                  <a className="btn btn--primary" href="#jogar">
                    Criar sala
                    <Arrow />
                  </a>
                  <a className="btn btn--secondary" href="#modos">
                    Ver os modos
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* WHAT YOU DO: the three modes as coloured cards on the desk,
            each with its toy on top and a drawing pinned at the bottom. */}
        <section className="section" id="modos" aria-labelledby="modos-h">
          <div className="wrap">
            <h2 id="modos-h" className="desk-title">
              Os modos de jogo
            </h2>
            <div className="modes">
              {MODES.map((m) => (
                <article key={m.id} id={m.id} className={`mode mode--${m.id}`}>
                  <img
                    className="mode__toy"
                    src={`${IMG}/mode-${m.id}.webp`}
                    alt=""
                    width={320}
                    height={320}
                    loading="lazy"
                    data-source="client"
                    data-subject="a toy for the game mode"
                  />
                  <p className="mode__players">
                    <Smiley />
                    <span aria-hidden="true">{m.count}</span>
                    <span className="ld-sr">{m.players}</span>
                  </p>
                  <h3>{m.name}</h3>
                  <p className="mode__text">{m.text}</p>
                  <img
                    className="mode__note"
                    src={`${IMG}/note-${m.id}.webp`}
                    alt={m.note}
                    width={520}
                    height={m.noteHeight}
                    loading="lazy"
                    data-source="client"
                    data-subject="a drawing made in the game"
                  />
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ONE ROUND: a folder with a tab for the title, the four phases inside. */}
        <section className="section" id="rodada" aria-labelledby="rodada-h">
          <div className="wrap">
            <div className="folder">
              <div className="folder__top">
                <div className="folder__tab">
                  <h2 id="rodada-h">Uma rodada de Racha-tema</h2>
                </div>
                <img
                  className="folder__toy"
                  src={`${IMG}/mascot-flyer-sm.webp`}
                  alt=""
                  width={300}
                  height={227}
                  loading="lazy"
                  data-source="client"
                  data-subject="the game's mascot"
                />
              </div>
              <div className="folder__body">
                <p className="folder__lead">
                  Quatro fases, todas com relógio. Com número ímpar de
                  jogadores, um fica de jurado.
                </p>
                <ol className="phases">
                  {ROUND.map((step, i) => (
                    <li key={step.name} className="phase">
                      <span className="phase__n" aria-hidden="true">
                        {i + 1}
                      </span>
                      <h3>{step.name}</h3>
                      <p>{step.text}</p>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </div>
        </section>

        {/* THE MOMENT: the page's one brand line, set large; it ripples under
            the pointer. Below it, the finished drawings on an arc you drag. */}
        <section
          className="section band ground-inverse"
          id="lenda"
          aria-labelledby="lenda-h"
        >
          <div className="wrap lenda-head">
            <div
              className="section-head"
              data-moment="liquid-type"
              style={{ maxWidth: "none" }}
            >
              <h2 id="lenda-h" className="mo-lt__type">
                Sua arte horrível vira lenda
              </h2>
              <p>
                Na tela final, os desenhos de todas as rodadas voltam de uma
                vez, cada um com o nome da dupla que fez.
              </p>
            </div>
            <img
              className="trophy"
              src={`${IMG}/mascot-trophy-sm.webp`}
              srcSet={`${IMG}/mascot-trophy-sm.webp 400w, ${IMG}/mascot-trophy.webp 800w`}
              sizes="(min-width: 1024px) 22vw, 40vw"
              alt=""
              width={800}
              height={724}
              loading="lazy"
              data-source="client"
              data-subject="a trophy with a scribbled face"
            />
          </div>
          <div className="lenda-carousel">
            <CircularGallery
              items={LEGENDS}
              bend={3}
              itemAspect={300 / 380}
              itemSize={1.05}
              gap={0.22}
              borderRadius={0}
              shadow={0}
              fadeEdges={0}
              wave={0.6}
              showTitles={false}
              textColor="#ffffff"
              font="700 30px Figtree, sans-serif"
              labels={{
                region: "Desenhos de partidas",
                close: "Fechar",
                of: "de",
                opened: "aberto",
                image: "Desenho",
              }}
            />
          </div>
        </section>

        {/* THE WORLD: every finished drawing drifting on a wall behind the words. */}
        <section
          className="section band ground-inverse"
          id="galeria"
          aria-labelledby="galeria-h"
        >
          <DriftWall
            className="galeria-wall"
            decorative
            items={WALL}
            columns={6}
            tileWidth={220}
            tileHeight={165}
            gap={20}
            radius={18}
            speed={28}
            dim={0.6}
            fade={0.5}
            overlayColor="#1c1630"
          />
          <div className="wrap galeria-front">
            <div className="galeria-text">
              <h2 id="galeria-h">Galeria de desenhos</h2>
              <p>
                {gallery
                  ? "No fim da partida, quem tem conta salva o desenho na galeria pública. Os dois autores assinam."
                  : "Personagens, rostos e temas desenhados em dupla, do jeito que saíram das partidas."}
              </p>
              {gallery && (
                <a className="btn btn--primary" href={GALLERY}>
                  Ver a galeria
                  <Arrow />
                </a>
              )}
            </div>
            <img
              className="galeria-head"
              src={`${IMG}/mascot-head.webp`}
              alt=""
              width={600}
              height={620}
              loading="lazy"
              data-source="client"
              data-subject="the game's mascot"
            />
          </div>
        </section>

        {/* PLAY: where the main action is done. */}
        <section className="section" id="jogar" aria-labelledby="jogar-h">
          <div className="wrap">
            <div className="grid grid--top">
              <div className="span-5">
                <div className="section-head">
                  <h2 id="jogar-h">Crie uma sala ou entre em uma</h2>
                  <p>
                    Escolha um apelido e o modo. O endereço da sala já é o
                    convite.
                  </p>
                </div>
                <ul className="rows">
                  <li>
                    <span className="rows__name">Convite</span>
                    <p>O link da sala, ou o código de 5 letras.</p>
                  </li>
                  <li>
                    <span className="rows__name">Queda de conexão</span>
                    <p>A vaga fica guardada por 20 segundos.</p>
                  </li>
                  <li>
                    <span className="rows__name">Celular</span>
                    <p>O papel aceita o dedo, além do mouse.</p>
                  </li>
                  <li>
                    <span className="rows__name">Limite</span>
                    <p>Racha-tema só começa com 4 jogadores na sala.</p>
                  </li>
                </ul>
              </div>
              <div className="span-6 start-7">
                <PlayForm>
                  {/* What a new room looks like; it makes way for the options. */}
                  <div className="frame frame--photo">
                    <img
                      className="frame__img"
                      src={`${IMG}/screen-lobby.webp`}
                      srcSet={`${IMG}/screen-lobby-sm.webp 768w, ${IMG}/screen-lobby.webp 1536w`}
                      sizes="(min-width: 1024px) 45vw, 100vw"
                      alt="Sala de espera: o código da sala, o link de convite, os seis jogadores e o botão de começar"
                      width={1536}
                      height={1368}
                      loading="lazy"
                      data-source="client"
                      data-subject="a screen of the game"
                    />
                  </div>
                </PlayForm>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer
        className="footer closing footer--dark ground-inverse"
        id="contact"
        aria-labelledby="close-h"
      >
        <div className="wrap">
          <div className="closing__cta close--type">
            <div className="section-head">
              <h2 id="close-h">Chame a turma para desenhar</h2>
              <p>De graça, sem instalar nada. A sala abre em segundos.</p>
            </div>
            <a className="btn btn--primary btn--xl btn--wide" href="#jogar">
              Criar sala
              <Arrow />
            </a>
          </div>
          <div className="closing__links">
            <div className="grid">
              <div className="span-4 stack-4">
                <Logo />
                <p className="footer__lede">
                  Party game de desenho para jogar com amigos no navegador.
                </p>
              </div>
              <div className="span-2 start-9 footer__col">
                <h3>Modos</h3>
                <ul>
                  {MODES.map((m) => (
                    <li key={m.id}>
                      <a href={`#${m.id}`}>{m.name}</a>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="span-2 footer__col">
                <h3>Jogo</h3>
                <ul>
                  <li>
                    <a href="#rodada">Rodada</a>
                  </li>
                  <li>
                    <a href="#galeria">Galeria</a>
                  </li>
                </ul>
              </div>
            </div>
            <div className="footer__legal">
              <span>&copy; 2026 Scrawl</span>
              <div className="socials" />
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
