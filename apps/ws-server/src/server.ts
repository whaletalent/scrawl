import { createServer } from "http";
import { WebSocketServer } from "ws";

const PORT = Number(process.env.PORT) || 8080;

const server = createServer();
const wss = new WebSocketServer({ server });

wss.on("connection", (ws) => {
  console.log("Client connected");
  ws.on("close", () => console.log("Client disconnected"));
});

server.listen(PORT, () => {
  console.log(`WebSocket server running on port ${PORT}`);
});
