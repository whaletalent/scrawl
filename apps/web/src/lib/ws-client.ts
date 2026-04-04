type MessageHandler = (data: any) => void;

let ws: WebSocket | null = null;
let handlers: MessageHandler[] = [];
let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

export function connect(url: string) {
  if (ws?.readyState === WebSocket.OPEN) return;

  ws = new WebSocket(url);

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      handlers.forEach((handler) => handler(data));
    } catch {
      // ignore malformed messages
    }
  };

  ws.onclose = () => {
    reconnectTimeout = setTimeout(() => connect(url), 2000);
  };

  ws.onerror = () => {
    ws?.close();
  };
}

export function disconnect() {
  if (reconnectTimeout) clearTimeout(reconnectTimeout);
  ws?.close();
  ws = null;
}

export function send(message: object) {
  if (ws?.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

export function onMessage(handler: MessageHandler): () => void {
  handlers.push(handler);
  return () => {
    handlers = handlers.filter((h) => h !== handler);
  };
}
