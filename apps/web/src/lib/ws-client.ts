type MessageHandler = (data: any) => void;

let ws: WebSocket | null = null;
let handlers: MessageHandler[] = [];
let openHandlers: (() => void)[] = [];
let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
let intentionalClose = false;

export function connect(url: string) {
  // Skip if already open or currently connecting
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return;

  intentionalClose = false;
  ws = new WebSocket(url);

  ws.onopen = () => {
    console.log("[ws] connected");
    openHandlers.forEach((handler) => handler());
  };

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      handlers.forEach((handler) => handler(data));
    } catch {
      // ignore malformed messages
    }
  };

  ws.onclose = () => {
    console.log("[ws] closed");
    if (!intentionalClose) {
      reconnectTimeout = setTimeout(() => connect(url), 2000);
    }
  };

  ws.onerror = (err) => {
    console.log("[ws] error, closing");
    ws?.close();
  };
}

export function disconnect() {
  intentionalClose = true;
  if (reconnectTimeout) clearTimeout(reconnectTimeout);
  reconnectTimeout = null;
  if (ws) {
    ws.onclose = null;
    ws.onerror = null;
    ws.onmessage = null;
    ws.close();
    ws = null;
  }
}

export function send(message: object) {
  if (ws?.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  } else if (ws?.readyState === WebSocket.CONNECTING) {
    // Queue send until connection opens
    const current = ws;
    const onOpen = () => {
      current.removeEventListener("open", onOpen);
      if (current.readyState === WebSocket.OPEN) {
        current.send(JSON.stringify(message));
      }
    };
    current.addEventListener("open", onOpen);
  }
}

/** Fires every time the socket opens — including after an automatic reconnect. */
export function onOpen(handler: () => void): () => void {
  openHandlers.push(handler);
  return () => {
    openHandlers = openHandlers.filter((h) => h !== handler);
  };
}

export function onMessage(handler: MessageHandler): () => void {
  handlers.push(handler);
  return () => {
    handlers = handlers.filter((h) => h !== handler);
  };
}
