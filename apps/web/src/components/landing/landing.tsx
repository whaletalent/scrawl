"use client";
import { useEffect } from "react";
import { BASE_PATH } from "@/lib/routes";
import { KitStyles, useKitScripts } from "./kit";
import { PlayForm } from "./play-form";

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
    name: "Racha-tema",
    players: "De 4 a 10 jogadores",
    title: "Racha-tema, de 4 a 10 jogadores",
    text: "Cada um escreve um tema, as duplas são sorteadas a cada rodada e a sala vota nos desenhos.",
    screen: "screen-party-drawing",
    alt: "Tela de desenho do modo Racha-tema, com o tema da rodada, o papel dividido ao meio e a barra de ferramentas",
    thumb: "drawing-party-1",
    thumbAlt: "Desenho de uma dupla no modo Racha-tema",
  },
  {
    id: "split-body",
    name: "Monstrinho",
    players: "2 jogadores",
    title: "Monstrinho, para 2 jogadores",
    text: "Um desenha a cabeça e o tronco, o outro as pernas, por cima da mesma silhueta. Depois vocês trocam.",
    screen: "screen-split-drawing",
    alt: "Tela do modo Monstrinho, com a metade de cima de um personagem desenhada sobre a silhueta",
    thumb: "drawing-split-1",
    thumbAlt: "Personagem desenhado por dois jogadores no modo Monstrinho",
  },
  {
    id: "face-builder",
    name: "Caricatura a dois",
    players: "2 jogadores",
    title: "Caricatura a dois, para 2 jogadores",
    text: "As seis partes de um rosto são sorteadas, três para cada um: cabelo, olhos, nariz, boca, orelhas e ombros.",
    screen: "screen-face-drawing",
    alt: "Tela do modo Caricatura a dois, com as partes do rosto de um jogador desenhadas sobre a moldura",
    thumb: "drawing-face-1",
    thumbAlt: "Rosto desenhado por dois jogadores no modo Caricatura a dois",
  },
];

const ROUND = [
  {
    name: "Tema",
    text: "Cada jogador escreve um. Com mais de 4 na sala, os temas vão a voto.",
    value: "30 s",
  },
  {
    name: "Desenho",
    text: "As duplas dividem o papel, um lado para cada jogador.",
    value: "15 s a 3 min",
  },
  {
    name: "Voto",
    text: "A sala vê os desenhos e escolhe o 1º, o 2º e o 3º lugar.",
    value: "20 s",
  },
  {
    name: "Placar",
    text: "Os pontos somam a cada rodada. A última rodada vale em dobro.",
    value: "8 s",
  },
];

/** Finished drawings on the gallery wall, in reading order. */
const WALL = [
  ["drawing-party-2", "Desenho de uma dupla no modo Racha-tema"],
  ["drawing-split-2", "Personagem do modo Monstrinho"],
  ["drawing-face-2", "Rosto do modo Caricatura a dois"],
  ["drawing-party-3", "Desenho de uma dupla no modo Racha-tema"],
  ["drawing-split-3", "Personagem do modo Monstrinho"],
  ["drawing-party-4", "Desenho de uma dupla no modo Racha-tema"],
  ["drawing-face-3", "Rosto do modo Caricatura a dois"],
  ["drawing-split-4", "Personagem do modo Monstrinho"],
];

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

/* THE SHEETS: every section is a sheet of paper lying on the desk, as tall as what it holds */
main#top > section.section, footer.closing { height: auto; min-height: 0; padding-block: var(--s-6); }
main#top > section.section > .wrap { box-sizing: border-box; height: auto; padding: clamp(24px, 4vw, 56px); background: var(--bg); box-shadow: 10px 10px 0 rgb(51 32 15 / .28); clip-path: polygon(0 0, calc(100% - 56px) 0, 100% 56px, 100% calc(100% + 12px), 0 calc(100% + 12px)); }
main#top > section.section > .wrap::before { content: ""; position: absolute; top: 0; right: 0; width: 56px; height: 56px; background: #e9dfc6; clip-path: polygon(0 0, 0 100%, 100% 100%); }
main#top > section.section > .wrap.ground-inverse::before { background: rgb(0 0 0 / .25); }
footer.closing { margin-top: var(--s-8); padding-block: var(--s-9) var(--s-6); }
footer.closing > .wrap { height: auto; display: grid; gap: var(--s-9); }

/* the game's screens are shown whole, at their own 16:10 */
#modos .card { position: relative; overflow: visible; border: 0; box-shadow: 6px 6px 0 rgb(51 32 15 / .25); }
#modos .panel { --p-h: 0px; aspect-ratio: 16 / 10; }
#modos .card > h3 { padding-right: 92px; }
#modos .grid { row-gap: var(--s-8); }
/* each picture is one part of a screen, cut by compose.mjs: the frames take its proportions */
#rodada .frame { --ratio: 90.2%; }
#lenda .frame { --ratio: 58.46%; }
.play-col .frame { --ratio: 158.14%; max-width: 300px; }
.frame--photo { box-shadow: 6px 6px 0 rgb(51 32 15 / .25); }
#lenda .frame--photo { box-shadow: 6px 6px 0 rgb(0 0 0 / .3); }
.mode-toy { position: absolute; top: -34px; right: var(--s-5); width: 88px; height: 88px; object-fit: contain; }
.trophy { position: absolute; right: clamp(24px, 4vw, 56px); top: clamp(24px, 4vw, 56px); width: 22vw; max-width: 300px; height: auto; }
@media (min-width: 1024px) { #lenda .section-head { padding-right: min(26vw, 340px); } }
@media (max-width: 1023px) { .trophy { display: none; } }
@media (max-width: 639px) { .mode-toy { width: 72px; height: 72px; top: -28px; } }

/* the wall: each drawing a card pinned to the sheet */
.wall { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: var(--s-5); }
.wall img { display: block; width: 100%; height: auto; aspect-ratio: 4 / 3; object-fit: cover; background: #fff; border: 6px solid #fff; box-sizing: border-box; box-shadow: 5px 5px 0 rgb(51 32 15 / .25); }

/* the play form: a darker sheet of its own */
.play { background: #f0e7cf; padding: var(--s-7); }
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
  :is(#rodada, #jogar) .rows { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); column-gap: var(--gutter); }
  :is(#rodada, #jogar) .rows > li:first-child { padding-top: var(--s-4); }
  .wall { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  /* each mode a row: its words beside its screen */
  #modos .grid > .card { display: grid; grid-template-columns: minmax(0, 3fr) minmax(0, 2fr); column-gap: var(--gutter); align-content: start; }
  #modos .card > :not(.panel, .mode-toy) { grid-column: 1; }
  #modos .card > .panel { grid-column: 2; grid-row: 1 / span 3; margin: 0; }
}
@media (min-width: 1024px) and (max-width: 1279px) {
  #modos .grid > .card { grid-column: span 4; }
}
@media (max-width: 639px) {
  /* on a phone the second hero action is a text link: white, on the desk */
  .hero--photo .btn-row { --ink: #fff; --line-strong: rgb(255 255 255 / .6); }
  /* a smaller fold, clear of the headings; the text-link button casts no shadow */
  main#top > section.section > .wrap { clip-path: polygon(0 0, calc(100% - 28px) 0, 100% 28px, 100% calc(100% + 12px), 0 calc(100% + 12px)); }
  main#top > section.section > .wrap::before { width: 28px; height: 28px; }
  .btn--secondary { box-shadow: none; }
  .wall { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--s-4); }
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

  return (
    <>
      <KitStyles pageCss={PAGE_CSS} />

      <header className="nav">
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
                  height={257}
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

        {/* WHAT YOU DO: the three modes as open cards, one capture each. */}
        <section
          className="section"
          id="modos"
          aria-labelledby="modos-h"
          style={{ "--hm": 2 } as React.CSSProperties}
        >
          <div className="wrap">
            <div className="section-head">
              <h2 id="modos-h">Os 3 modos de Scrawl</h2>
              <p>
                Racha-tema para a turma inteira. Monstrinho e Caricatura a dois
                para jogar a dois.
              </p>
            </div>
            <div className="grid">
              {MODES.map((m) => (
                <article
                  key={m.id}
                  id={m.id}
                  className="card card--row m-nolift span-4"
                >
                  <img
                    className="mode-toy"
                    src={`${IMG}/mode-${m.id}.webp`}
                    alt=""
                    width={320}
                    height={320}
                    loading="lazy"
                    data-source="client"
                    data-subject="a toy for the game mode"
                  />
                  <h3>{m.title}</h3>
                  <p>{m.text}</p>
                  <div className="panel">
                    <img
                      className="frame__img"
                      src={`${IMG}/${m.screen}.webp`}
                      srcSet={`${IMG}/${m.screen}-sm.webp 800w, ${IMG}/${m.screen}.webp 1600w`}
                      sizes="(min-width: 640px) 40vw, 130vw"
                      alt={m.alt}
                      width={1600}
                      height={1000}
                      loading="lazy"
                      data-source="client"
                      data-subject="a screen of the game"
                    />
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* THE CREW AT WORK: one Racha-tema round, step by step, beside the vote. */}
        <section
          className="section"
          id="rodada"
          aria-labelledby="rodada-h"
          style={{ "--hm": 2 } as React.CSSProperties}
        >
          <div className="wrap">
            <div className="grid grid--top">
              <div className="span-5">
                <div className="section-head">
                  <h2 id="rodada-h">Uma rodada de Racha-tema</h2>
                  <p>
                    Quatro fases, todas com relógio. Com número ímpar de
                    jogadores, um fica de jurado.
                  </p>
                </div>
                <ol className="rows">
                  {ROUND.map((step) => (
                    <li key={step.name}>
                      <span className="rows__name">{step.name}</span>
                      <p>{step.text}</p>
                      <span className="rows__value">{step.value}</span>
                    </li>
                  ))}
                </ol>
              </div>
              <div className="frame frame--photo frame--split span-6 start-7">
                <img
                  className="frame__img"
                  src={`${IMG}/screen-party-voting.webp`}
                  srcSet={`${IMG}/screen-party-voting-sm.webp 663w, ${IMG}/screen-party-voting.webp 1327w`}
                  sizes="(min-width: 1024px) 56vw, (min-width: 640px) 100vw, 150vw"
                  alt="Um desenho na votação do Racha-tema, com os botões de 1º, 2º e 3º lugar"
                  width={1327}
                  height={1197}
                  loading="lazy"
                  data-source="client"
                  data-subject="a screen of the game"
                />
              </div>
            </div>
          </div>
        </section>

        {/* THE MOMENT: the page's one brand line, set large; it ripples under the pointer. */}
        <section className="section" id="lenda" aria-labelledby="lenda-h">
          <div className="wrap ground-inverse">
            <img
              className="trophy"
              src={`${IMG}/mascot-trophy-sm.webp`}
              srcSet={`${IMG}/mascot-trophy-sm.webp 400w, ${IMG}/mascot-trophy.webp 800w`}
              sizes="24vw"
              alt=""
              width={800}
              height={724}
              loading="lazy"
              data-source="client"
              data-subject="a trophy with a scribbled face"
            />
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
            <div className="frame frame--photo">
              <img
                className="frame__img"
                src={`${IMG}/screen-party-results.webp`}
                srcSet={`${IMG}/screen-party-results-sm.webp 800w, ${IMG}/screen-party-results.webp 1600w`}
                sizes="(min-width: 1024px) 90vw, 100vw"
                alt="As obras-primas no fim de uma partida de Racha-tema: três desenhos com tema e autores"
                width={1600}
                height={935}
                loading="lazy"
                data-source="client"
                data-subject="a screen of the game"
              />
            </div>
          </div>
        </section>

        {/* THE WORLD: finished drawings, as a wall from line to line. */}
        <section className="section" id="galeria" aria-labelledby="galeria-h">
          <div className="wrap">
            <div className="section-head--split section-head">
              <div>
                <h2 id="galeria-h">Galeria de desenhos</h2>
                <p>
                  {gallery
                    ? "No fim da partida, quem tem conta salva o desenho na galeria pública. Os dois autores assinam."
                    : "Personagens, rostos e temas desenhados em dupla, do jeito que saíram das partidas."}
                </p>
              </div>
              {gallery && (
                <a className="link" href={GALLERY}>
                  Ver a galeria
                </a>
              )}
            </div>
            <div className="wall">
              {WALL.map(([file, alt]) => (
                <img
                  key={file}
                  src={`${IMG}/${file}.webp`}
                  srcSet={`${IMG}/${file}-sm.webp 400w, ${IMG}/${file}.webp 800w`}
                  sizes="(min-width: 1024px) 23vw, 50vw"
                  alt={alt}
                  width={800}
                  height={600}
                  loading="lazy"
                  data-source="client"
                  data-subject="a drawing made in the game"
                />
              ))}
            </div>
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
                      srcSet={`${IMG}/screen-lobby-sm.webp 430w, ${IMG}/screen-lobby.webp 860w`}
                      sizes="(min-width: 1024px) 45vw, 100vw"
                      alt="Sala de espera: o código da sala, o link de convite, os seis jogadores e o botão de começar"
                      width={860}
                      height={1360}
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
