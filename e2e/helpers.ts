import { expect, type Page } from "@playwright/test";
import { join, IMG, type TestClient } from "../apps/ws-server/test/client";

export const WS_URL = "ws://localhost:8089";

type Mode = "Party (4-10)" | "Split Body (2)" | "Face Builder (2)";

const CREATE_BUTTON: Record<Mode, string> = {
  "Party (4-10)": "Criar Party",
  "Split Body (2)": "Criar Split Body",
  "Face Builder (2)": "Criar Face Builder",
};

/**
 * Creates a room through the landing page and returns its code.
 * `turnSeconds` is the value of the "Tempo por turno" select (15–180).
 */
export async function createRoom(
  page: Page,
  { nickname = "Ana", mode, rounds, turnSeconds }: { nickname?: string; mode: Mode; rounds?: number; turnSeconds?: number }
): Promise<string> {
  await page.goto("/");
  await page.getByPlaceholder("Seu apelido").fill(nickname);
  await page.getByRole("button", { name: "Criar sala" }).click();
  if (rounds) {
    // The round picker only shows for 2-player modes, but the choice sticks
    // when switching back to Party.
    await page.getByRole("button", { name: "Split Body (2)" }).click();
    await page.getByRole("button", { name: String(rounds), exact: true }).click();
  }
  await page.getByRole("button", { name: mode }).click();
  if (turnSeconds) await page.getByRole("combobox").selectOption(String(turnSeconds));
  await page.getByRole("button", { name: CREATE_BUTTON[mode] }).click();

  await expect(page).toHaveURL(/\/room\/\?code=[A-Z0-9]{5}$/);
  return new URL(page.url()).searchParams.get("code")!;
}

/** Drags the mouse across the canvas; points are fractions of its width/height. */
export async function draw(page: Page, points: [number, number][]) {
  const box = (await page.locator("canvas").boundingBox())!;
  const at = ([fx, fy]: [number, number]) => [box.x + fx * box.width, box.y + fy * box.height] as const;
  await page.mouse.move(...at(points[0]));
  await page.mouse.down();
  for (const point of points.slice(1)) await page.mouse.move(...at(point), { steps: 4 });
  await page.mouse.up();
}

/** Whether anything other than white was painted on the canvas. */
export function canvasHasInk(page: Page): Promise<boolean> {
  return page.locator("canvas").evaluate((canvas: HTMLCanvasElement) => {
    const { data } = canvas.getContext("2d")!.getImageData(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < data.length; i += 4) {
      const opaque = data[i + 3] > 0;
      const white = data[i] === 255 && data[i + 1] === 255 && data[i + 2] === 255;
      if (opaque && !white) return true;
    }
    return false;
  });
}

/** A scripted player that joins over the raw WebSocket protocol. */
export function bot(roomCode: string, nickname: string): Promise<TestClient> {
  return join(WS_URL, roomCode, nickname);
}

/** Makes a party-mode bot play by itself: theme, drawing and a 1st-place vote. */
export function autoplayParty(b: TestClient) {
  let pairId: string | null = null;
  b.on((m) => {
    if (m.type === "phase-change" && m.phase === "theme-creation") {
      pairId = null;
      b.send({ type: "submit-theme", text: `Tema de ${b.name}` });
    }
    if (m.type === "pair-assigned") {
      pairId = m.pairId;
      b.send({ type: "submit-drawing", imageDataUrl: IMG });
    }
    if (m.type === "drawings-ready") {
      const other = m.drawings.find((d: { pairId: string }) => d.pairId !== pairId);
      if (other) b.send({ type: "vote-drawing", pairId: other.pairId, rank: 1 });
    }
  });
}

/** Fails the test if the page throws or logs an error. Call before navigating. */
export function failOnPageErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`exception: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(`console.error: ${m.text()}`);
  });
  return errors;
}

export { IMG };
