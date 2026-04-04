import { createServer } from "http";
import { WebSocketServer } from "ws";
import { handleConnection } from "./handlers.js";

const PORT = Number(process.env.PORT) || 8080;

const server = createServer((_req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Scrawl WebSocket Server");
});

const wss = new WebSocketServer({ server });

wss.on("connection", (ws) => {
  handleConnection(ws);
});

server.listen(PORT, () => {
  console.log(`Scrawl WebSocket server running on port ${PORT}`);
});
