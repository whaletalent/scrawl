import { createServer } from "http";
import { WebSocketServer } from "ws";
import { handleConnection } from "./handlers.js";

/** Largest message a client may send. */
export const MAX_MESSAGE_BYTES = 4 * 1024 * 1024;

/** Builds the HTTP + WebSocket server without listening, so tests can pick the port. */
export function createScrawlServer() {
  const server = createServer((_req, res) => {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("Scrawl WebSocket Server");
  });

  // A drawing is a PNG data URL of a few hundred KB at most; ws defaults to 100MB.
  const wss = new WebSocketServer({ server, maxPayload: MAX_MESSAGE_BYTES });
  wss.on("connection", (ws) => {
    handleConnection(ws);
  });

  return { server, wss };
}
