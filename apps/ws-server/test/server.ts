import type { AddressInfo } from "net";
import { createScrawlServer } from "../src/app.js";
import { config } from "../src/config.js";
import { setAccounts, type Accounts } from "../src/accounts.js";
import { closeAll, sleep } from "./client.js";

/**
 * Starts the real server in-process on a free port.
 * `timeScale` / `graceMs` tune `config` — both are read at use-time, so a test
 * may also change `config` directly halfway through.
 * `accounts` stands in for Supabase; without it accounts are off.
 */
export async function startServer({
  timeScale = 1,
  graceMs = 200,
  submitGraceMs = 50,
  accounts = null as Accounts | null,
} = {}) {
  config.timeScale = timeScale;
  config.reconnectGraceMs = graceMs;
  config.submitGraceMs = submitGraceMs;
  setAccounts(accounts);

  const { server, wss } = createScrawlServer();
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const url = `ws://localhost:${(server.address() as AddressInfo).port}`;

  return {
    url,
    async stop() {
      // Let every room die quickly: drop the grace period, close all sockets,
      // then wait for the (now short) grace timers to remove the players.
      config.reconnectGraceMs = 1;
      closeAll();
      for (const ws of wss.clients) ws.terminate();
      await sleep(50);
      await new Promise((resolve) => server.close(resolve));
      setAccounts(null);
    },
  };
}
