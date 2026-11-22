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
  moments: liquid-type on the statement (#lenda)
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
    name: "Party",
    players: "De 4 a 10 jogadores",
    title: "Party, de 4 a 10 jogadores",
    text: "Cada um escreve um tema, as duplas são sorteadas a cada rodada e a sala vota nos desenhos.",
    screen: "screen-party-drawing",
    alt: "Tela de desenho do modo Party, com o tema da rodada, o papel dividido ao meio e a barra de ferramentas",
    thumb: "drawing-party-1",
    thumbAlt: "Desenho de uma dupla no modo Party",
  },
  {
    id: "split-body",
    name: "Split Body",
    players: "2 jogadores",
    title: "Split Body, para 2 jogadores",
    text: "Um desenha a cabeça e o tronco, o outro as pernas, por cima da mesma silhueta. Depois vocês trocam.",
    screen: "screen-split-drawing",
    alt: "Tela do modo Split Body, com a metade de cima de um personagem desenhada sobre a silhueta",
    thumb: "drawing-split-1",
    thumbAlt: "Personagem desenhado por dois jogadores no modo Split Body",
  },
  {
    id: "face-builder",
    name: "Face Builder",
    players: "2 jogadores",
    title: "Face Builder, para 2 jogadores",
    text: "As seis partes de um rosto são sorteadas, três para cada um: cabelo, olhos, nariz, boca, orelhas e ombros.",
    screen: "screen-face-drawing",
    alt: "Tela do modo Face Builder, com as partes do rosto de um jogador desenhadas sobre a moldura",
    thumb: "drawing-face-1",
    thumbAlt: "Rosto desenhado por dois jogadores no modo Face Builder",
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
  ["drawing-party-2", "Desenho de uma dupla no modo Party"],
  ["drawing-split-2", "Personagem do modo Split Body"],
  ["drawing-face-2", "Rosto do modo Face Builder"],
  ["drawing-party-3", "Desenho de uma dupla no modo Party"],
  ["drawing-split-3", "Personagem do modo Split Body"],
  ["drawing-party-4", "Desenho de uma dupla no modo Party"],
  ["drawing-face-3", "Rosto do modo Face Builder"],
  ["drawing-split-4", "Personagem do modo Split Body"],
];

/*
  Page CSS: the brand bar, the hero's art, what sits inside a visual or the
  play form, and the page's own motion. The kit already moves the hero's
  words on load, every hover and press, and the big headline in #lenda; added
  here, each once:
  - the hero's mascots arrive (the crew, then the flyer 200ms later), then
    float slowly: the crew 10px up and down, the flyer on its own small arc;
  - a step of the play form (options, room code) fades up as it replaces the
    last one, and a field's error fades in.
  Reduced motion keeps the fades and drops every movement.
*/
const PAGE_CSS = `
html.ld-wait body > :is(header, main, footer) { visibility: hidden; }
/* the brand bar: orange, with the page links in one darker pill */
header.nav { --bg: var(--p-accent); --ink: #ffffff; --muted: #ffffff; --line: transparent; --line-strong: rgb(255 255 255 / .5); --accent: #ffffff; --action: var(--p-bg); --action-ink: var(--p-ink); }
header.nav .nav__menu, header.nav.is-open { --bg: var(--p-bg); --ink: var(--p-ink); --muted: var(--p-muted); --action: var(--p-action); --action-ink: var(--p-action-ink); --line: color-mix(in oklab, var(--p-ink) 11%, transparent); }
@media (min-width: 1024px) {
  header.nav .nav__links { flex: none; height: 44px; align-self: center; margin-right: auto; margin-left: var(--s-6); padding: 0 var(--s-2); border-radius: 999px; background: rgb(0 0 0 / .14); }
}
/* the hero: the same orange, the sheets on its right */
.hero--photo { background: var(--p-accent); }
.hero-art { overflow: hidden; background: var(--p-accent); color: rgb(255 255 255 / .2); }
.hero-art__doodles { position: absolute; inset: 0; width: 100%; height: 100%; }
.hero-art__crew { position: absolute; right: 1vw; top: 50%; width: 50vw; max-width: none; height: auto; margin-top: -12vw; }
.hero-art__flyer { position: absolute; right: 6vw; top: calc(var(--nav) + 2vw); width: 11vw; min-width: 96px; height: auto; }
.hero--photo .btn-row { --action: var(--p-bg); --action-ink: var(--p-ink); }
@media (max-width: 1023px) {
  /* the kit moves the words under the picture, onto the page ground: here they stay on the orange, in white */
  .hero.hero--photo[data-tone] { background: var(--p-accent); color: #fff; --ink: #fff; --muted: #fff; }
  .hero--photo .btn-row { --ink: #fff; --line-strong: rgb(255 255 255 / .6); }
  .hero-art__crew { right: auto; left: 4vw; top: 50%; width: 92vw; margin-top: -24vw; }
  .hero-art__flyer { display: none; }
}
/* the logo, a toy on each mode's card, the trophy */
.nav__logo .logo-mark { flex: none; width: 36px; height: 36px; max-width: none; margin-right: var(--s-2); border-radius: 10px; }
#modos .card { position: relative; overflow: visible; }
.mode-toy { position: absolute; top: -34px; right: var(--s-5); width: 88px; height: 88px; object-fit: contain; }
#lenda .wrap { position: relative; }
.trophy { position: absolute; right: 0; top: -24px; width: 24vw; max-width: 340px; height: auto; }
@media (max-width: 1023px) { .trophy { display: none; } }
@media (max-width: 639px) { .mode-toy { width: 72px; height: 72px; top: -28px; } }
/* motion (see the note above PAGE_CSS) */
@media (prefers-reduced-motion: no-preference) {
  .hero-art__crew { animation: sheet-in 700ms var(--m-ease-enter) both, sheet-float 7s ease-in-out 0.7s infinite alternate; }
  .hero-art__flyer { animation: sheet-in 700ms var(--m-ease-enter) 200ms both, flyer-float 5s ease-in-out 0.9s infinite alternate; }
  .play .step { transition: opacity 200ms var(--ease), transform 200ms var(--ease); }
  @starting-style { .play .step { opacity: 0; transform: translateY(8px); } }
}
@media (prefers-reduced-motion: reduce) {
  .hero-art__crew, .hero-art__flyer { animation: sheet-fade 600ms var(--m-ease-enter) both; }
  .play .step { transition: opacity 200ms var(--ease); }
  @starting-style { .play .step { opacity: 0; } }
}
.play .field__error { transition: opacity 150ms var(--ease); }
@starting-style { .play .field__error { opacity: 0; } }
@keyframes sheet-in { from { opacity: 0; transform: translateY(24px) scale(0.96); } }
@keyframes sheet-fade { from { opacity: 0; } }
@keyframes flyer-float { from { transform: translate(0, 8px) rotate(-3deg); } to { transform: translate(-10px, -8px) rotate(3deg); } }
@keyframes sheet-float { from { transform: translateY(-10px); } to { transform: translateY(10px); } }
#modos .panel { --p-h: 0px; aspect-ratio: 5 / 4; }
.wall { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 2px; border-radius: var(--r-lg); overflow: clip; }
.wall img { display: block; width: 100%; aspect-ratio: 4 / 3; object-fit: cover; background: #fff; }
.play { background: var(--surface); box-shadow: 0 12px 32px rgb(51 32 15 / .08); padding: var(--s-7); border-radius: var(--r-lg); }
.play .field > span { font-size: var(--t-small); font-weight: 500; }
.play-col { display: grid; gap: var(--s-5); }
.play-col .frame { --ratio: 50%; }
#lenda .frame__img { object-position: 50% 100%; }
.play__code { text-transform: uppercase; letter-spacing: 0.2em; }
.opt { display: flex; flex-wrap: wrap; gap: var(--s-2); }
.opt button { min-width: 44px; height: 44px; padding: 0 var(--s-4); border: 1px solid var(--line); border-radius: var(--r-sm); background: transparent; color: var(--ink); font: 500 var(--t-small)/1 var(--font-text); cursor: pointer; }
.opt button[aria-pressed="true"] { background: var(--ink); border-color: var(--ink); color: var(--bg); }
.opt--swatch button { width: 44px; padding: 0; border-radius: 999px; border-width: 2px; }
.opt--swatch button[aria-pressed="true"] { border-color: var(--ink); outline: 2px solid var(--bg); outline-offset: -4px; }
@media (min-width: 1024px) and (max-width: 1279px) {
  /* the three modes stay side by side, so the section stays one screen */
  #modos .grid > .card { grid-column: span 4; }
  #modos .panel { aspect-ratio: 16 / 10; }
}
@media (max-width: 1023px) {
  #rodada .frame, #lenda .frame { --ratio: 62.5%; }
  .play { background: none; padding: 0; border-radius: 0; }
}
@media (min-width: 640px) and (max-width: 1023px) {
  :is(#rodada, #jogar) .rows { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); column-gap: var(--gutter); }
  :is(#rodada, #jogar) .rows > li:first-child { padding-top: var(--s-4); }
  .wall { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .wall img:nth-child(n + 5) { display: none; }
  .play-col .frame { --ratio: 40%; }
  #modos .panel { aspect-ratio: 16 / 10; }
  /* each mode a row: its words beside its screen */
  #modos .grid > .card { display: grid; grid-template-columns: minmax(0, 3fr) minmax(0, 2fr); column-gap: var(--gutter); align-content: start; }
  #modos .card > :not(.panel) { grid-column: 1; }
  #modos .card > .panel { grid-column: 2; grid-row: 1 / span 3; margin: 0; }
}
@media (max-width: 639px) {
  .wall { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .wall img:nth-child(n + 7) { display: none; }
  #rodada .frame { --ratio: 100%; }
  /* the phone keeps the form and the room: the small print stays on wider screens */
  #jogar .rows { display: none; }
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
            <img
              className="hero-art__flyer"
              src={`${IMG}/mascot-flyer-sm.webp`}
              alt=""
              width={300}
              height={257}
              data-source="client"
              data-subject="the game's mascot"
            />
          </div>
          <div className="wrap">
            <div className="hero-text">
              <div className="hero__text">
                <h1 id="hero-h">Scrawl, party game de desenho</h1>
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
                Party para a turma inteira. Split Body e Face Builder para jogar
                a dois.
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

        {/* THE CREW AT WORK: one Party round, step by step, beside the vote. */}
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
                  <h2 id="rodada-h">Uma rodada de Party</h2>
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
                  srcSet={`${IMG}/screen-party-voting-sm.webp 800w, ${IMG}/screen-party-voting.webp 1600w`}
                  sizes="(min-width: 1024px) 56vw, (min-width: 640px) 100vw, 150vw"
                  alt="Tela de votação do modo Party, com os desenhos das duplas e os botões de 1º, 2º e 3º lugar"
                  width={1600}
                  height={1000}
                  loading="lazy"
                  data-source="client"
                  data-subject="a screen of the game"
                />
              </div>
            </div>
          </div>
        </section>

        {/* THE MOMENT: the page's one brand line, set large; it ripples under the pointer. */}
        <section
          className="section ground-inverse"
          id="lenda"
          aria-labelledby="lenda-h"
        >
          <div className="wrap">
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
            <div className="frame frame--photo fit-screen">
              <img
                className="frame__img"
                src={`${IMG}/screen-party-results.webp`}
                srcSet={`${IMG}/screen-party-results-sm.webp 800w, ${IMG}/screen-party-results.webp 1600w`}
                sizes="(min-width: 1024px) 90vw, 100vw"
                alt="Tela de resultado final de uma partida de Party, com o placar e os desenhos de todas as rodadas"
                width={1600}
                height={1000}
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
                    <p>Party só começa com 4 jogadores na sala.</p>
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
                      srcSet={`${IMG}/screen-lobby-sm.webp 601w, ${IMG}/screen-lobby.webp 1202w`}
                      sizes="(min-width: 1024px) 45vw, 100vw"
                      alt="Sala de espera de uma partida de Party, com o código da sala, o link de convite e os jogadores que já entraram"
                      width={1202}
                      height={601}
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
