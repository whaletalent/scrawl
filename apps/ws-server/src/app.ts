import { createServer } from "http";
import { WebSocketServer } from "ws";
import { handleConnection } from "./handlers.js";

/** Builds the HTTP + WebSocket server without listening, so tests can pick the port. */
export function createScrawlServer() {
  const server = createServer((_req, res) => {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("Scrawl WebSocket Server");
  });

  const wss = new WebSocketServer({ server });
  wss.on("connection", (ws) => {
    handleConnection(ws);
  });

  return { server, wss };
}
