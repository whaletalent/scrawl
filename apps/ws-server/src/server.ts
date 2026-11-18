import { createScrawlServer } from "./app.js";

const PORT = Number(process.env.PORT) || 8080;

createScrawlServer().server.listen(PORT, () => {
  console.log(`Scrawl WebSocket server running on port ${PORT}`);
});
