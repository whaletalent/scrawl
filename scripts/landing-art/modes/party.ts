import type { Browser } from "playwright";
import { PARTY_DESIGNS } from "../art/party";
import {
  compose,
  enter,
  record,
  roomCode,
  savePng,
  screenshot,
  type Player,
} from "../lib/game";
import { Pen } from "../lib/pen";

const NAMES = ["Ana", "Bia", "Caio", "Duda", "Léo", "Rafa"];
/** Themes that are submitted too but never win the vote. */
const DECOYS = [
  "sapo de terno",
  "abacaxi surfista",
  "vovó ninja",
  "geladeira triste",
  "pombo detetive",
  "banana de óculos",
];
/** Seconds of the drawing phase; long enough for six tabs drawing at once. */
const TURN = Number(process.env.LANDING_ART_TURN) || 90;
const SLOW = { timeout: 180_000 };

type PartyResult = {
  pairId: string;
  themeText: string;
  imageLeftDataUrl: string;
  imageRightDataUrl: string;
  round: number;
  playerNames: [string, string];
  stripFrames: { strip: number; member: number; imageDataUrl: string }[];
};

/** The middle strip of a pair's paper (see apps/web/src/lib/seam-geometry.ts). */
const STRIP = { x: 350, y: 0, w: 100, h: 600 };
const FULL = { x: 0, y: 0, w: 800, h: 600 };

async function join(browser: Browser, names: string[], rounds: number) {
  const host = await enter(browser, names[0], "new", {
    gameMode: "party",
    totalRounds: rounds,
    turnDuration: TURN,
  });
  const code = await roomCode(host);
  const players = [host];
  for (const name of names.slice(1)) {
    const p = await enter(browser, name, code);
    await roomCode(p);
    players.push(p);
  }
  await host.page.getByText(`Jogadores (${names.length}/10)`).waitFor();
  return players;
}

/** One player's half of the round's drawing, then "Enviar Desenho". */
async function drawHalf(player: Player, index: number, shot?: string) {
  const assigned = await player.next("pair-assigned", SLOW.timeout);
  const side = assigned.side as "left" | "right";
  const design = PARTY_DESIGNS.find((d) => d.theme === assigned.theme);
  if (!design) throw new Error(`no drawing for theme "${assigned.theme}"`);
  const { page } = player;
  const send = page.getByRole("button", { name: "Enviar Desenho" });
  await send.waitFor(SLOW);
  const pen = new Pen(page, {
    side,
    seed: 500 + index * 31 + PARTY_DESIGNS.indexOf(design),
    shake: 1.5 + index * 0.35,
    // The screenshot goes to whoever got the most recognisable half.
    onMark:
      shot && design === PARTY_DESIGNS[0] && side === "left"
        ? () => screenshot(page, shot)
        : undefined,
  });
  await design[side](pen);
  for (const leak of pen.leaks)
    console.warn(`party "${design.theme}" ${side}: fill leaked — ${leak}`);
  await send.click();
}

async function saveResults(player: Player, results: PartyResult[]) {
  for (const d of results) {
    const number = PARTY_DESIGNS.findIndex((x) => x.theme === d.themeText) + 1;
    const file = `drawing-party-${number}.png`;
    savePng(
      file,
      // Stacked like composeLayers in apps/web/src/lib/compose-drawing.ts:
      // each member's kept strip frames, then their whole layer.
      await compose(
        player.page,
        [d.imageLeftDataUrl, d.imageRightDataUrl].flatMap((src, member) => [
          ...d.stripFrames
            .filter((f) => f.member === member)
            .map((f) => ({ src: f.imageDataUrl, ...STRIP })),
          { src, ...FULL },
        ]),
      ),
    );
    await record({
      [file]: {
        mode: "party",
        theme: d.themeText,
        left: d.playerNames[0],
        right: d.playerNames[1],
      },
    });
  }
}

/**
 * The full set: two six-player games of one round each, three themes drawn
 * per game, plus the lobby, drawing, voting and results screenshots from the
 * host's tab in the first one.
 *
 * Two games rather than one game of two rounds: the web client keeps the
 * previous round's themes in its state, so from round 2 on the theme form
 * believes every player has already used up their themes.
 */
export async function runParty(browser: Browser) {
  for (const game of [0, 1]) await playGame(browser, game);
}

async function playGame(browser: Browser, game: number) {
  const shots = game === 0;
  const themes = PARTY_DESIGNS.slice(game * 3, game * 3 + 3).map(
    (d) => d.theme,
  );
  const decoys = DECOYS.slice(game * 3, game * 3 + 3);
  const players = await join(browser, NAMES, 1);
  const host = players[0];
  if (shots) {
    await host.page.waitForTimeout(500);
    await screenshot(host.page, "screen-lobby.png");
  }
  await host.page.getByRole("button", { name: "Começar jogo" }).click();

  // Six players: one theme each. The first three bring the ones we draw.
  await Promise.all(
    players.map(async ({ page }, i) => {
      await page.getByRole("heading", { name: "Crie um tema" }).waitFor(SLOW);
      const input = page.getByRole("textbox");
      await input.fill(i < 3 ? themes[i] : decoys[i - 3]);
      await input.press("Enter");
    }),
  );

  // Everyone spends both votes on those three (never on their own).
  await Promise.all(
    players.map(async ({ page }, i) => {
      await page.getByRole("heading", { name: "Vote nos temas" }).waitFor(SLOW);
      const picks = [0, 1, 2]
        .map((k) => themes[(k + i) % 3])
        .filter((t) => t !== themes[i])
        .slice(0, 2);
      for (const theme of picks)
        await page.getByRole("button", { name: theme }).click();
    }),
  );

  await Promise.all(
    players.map((p, i) =>
      drawHalf(p, i, shots ? "screen-party-drawing.png" : undefined),
    ),
  );

  // Two drawings to rank each (a pair can't vote for its own).
  await Promise.all(
    players.map(async ({ page }, i) => {
      await page
        .getByRole("heading", { name: "Vote nos melhores" })
        .waitFor(SLOW);
      const first = i % 3 === 0 ? 1 : 0;
      await page.getByRole("button", { name: "1º" }).nth(first).click();
      await page
        .getByRole("button", { name: "2º" })
        .nth(1 - first)
        .click();
      if (shots && i === 0) {
        // Clicking the second card scrolled the page down to it.
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.waitForTimeout(400);
        await screenshot(page, "screen-party-voting.png");
      }
    }),
  );

  const final = await host.next("final-results", 300_000);
  await host.page.getByRole("heading", { name: "Placar final" }).waitFor();
  await host.page.waitForTimeout(800);
  if (shots) await screenshot(host.page, "screen-party-results.png");
  await saveResults(host, final.drawings as PartyResult[]);
  for (const p of players) await p.page.context().close();
}

/**
 * A quick four-player round that redraws one or two themes (1-based numbers)
 * without replaying the whole game. No screenshots.
 */
export async function runPartyPair(browser: Browser, numbers: number[]) {
  const themes = numbers
    .slice(0, 2)
    .map((n) => PARTY_DESIGNS[n - 1]?.theme)
    .filter(Boolean);
  if (themes.length === 0) return;
  const players = await join(browser, NAMES.slice(0, 4), 1);
  const host = players[0];
  await host.page.getByRole("button", { name: "Começar jogo" }).click();

  // Four players skip the theme vote: every submitted theme is drawn.
  for (const [i, theme] of themes.entries()) {
    const { page } = players[i];
    await page.getByRole("heading", { name: "Crie um tema" }).waitFor(SLOW);
    const input = page.getByRole("textbox");
    await input.fill(theme);
    await input.press("Enter");
    await page.waitForTimeout(300);
  }
  await Promise.all(players.map((p, i) => drawHalf(p, i)));
  const ready = await host.next("drawings-ready", SLOW.timeout);
  const results = (ready.drawings as PartyResult[]).filter(
    (d, i, all) => all.findIndex((x) => x.themeText === d.themeText) === i,
  );
  await saveResults(host, results);
  for (const p of players) await p.page.context().close();
}
