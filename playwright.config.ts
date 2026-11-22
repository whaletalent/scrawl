import { defineConfig, devices } from "@playwright/test";

// The e2e run gets its own servers on ports that don't clash with `npm run dev`,
// with a separate Next build dir so both can run side by side.
const WS_PORT = 8089;
const WEB_PORT = 3100;
// Accounts are ON for the whole run, against an in-process fake of Supabase
// (apps/ws-server/test/fake-supabase.ts) — never a real project.
const SUPABASE_PORT = 8090;
const SUPABASE_URL = `http://localhost:${SUPABASE_PORT}`;

/** Speeds up every game phase (see apps/ws-server/src/config.ts). */
export const TIME_SCALE = 0.15;
/** How long the server holds a disconnected player's slot during the e2e run. */
export const GRACE_MS = 3000;

export default defineConfig({
  testDir: "./e2e",
  timeout: 120_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  workers: 2,
  forbidOnly: !!process.env.CI,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${WEB_PORT}`,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: "npx tsx apps/ws-server/test/fake-supabase.ts",
      url: SUPABASE_URL,
      env: { PORT: String(SUPABASE_PORT) },
      reuseExistingServer: false,
    },
    {
      command: "npx tsx apps/ws-server/src/server.ts",
      url: `http://localhost:${WS_PORT}`,
      env: {
        PORT: String(WS_PORT),
        PHASE_TIME_SCALE: String(TIME_SCALE),
        RECONNECT_GRACE_MS: String(GRACE_MS),
        SUPABASE_URL,
        SUPABASE_SECRET_KEY: "test-secret",
      },
      reuseExistingServer: false,
    },
    {
      command: `npx next dev apps/web --port ${WEB_PORT}`,
      url: `http://localhost:${WEB_PORT}`,
      env: {
        NEXT_PUBLIC_WS_URL: `ws://localhost:${WS_PORT}`,
        NEXT_DIST_DIR: ".next-e2e",
        NEXT_PUBLIC_SUPABASE_URL: SUPABASE_URL,
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "test-publishable",
      },
      timeout: 120_000,
      reuseExistingServer: false,
    },
  ],
});
