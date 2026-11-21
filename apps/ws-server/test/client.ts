import WebSocket from "ws";
import { crc32, deflateSync } from "zlib";

/** Any server → client message. Tests poke at these loosely on purpose. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Msg = any;
export type Pred = (m: Msg) => boolean;

export interface TestClient {
  name: string;
  ws: WebSocket;
  /** Every message received so far, in order. */
  msgs: Msg[];
  playerId: string;
  /** Session token from the last `room-state`. */
  token: string;
  /** Room state from the last `room-state`. */
  state: Msg;
  send(message: object): void;
  close(): void;
  /** Resolves with the next message matching `pred` that arrives from now on. */
  wait(pred: Pred, timeoutMs?: number): Promise<Msg>;
  /** Runs `handler` for every message received from now on. */
  on(handler: (m: Msg) => void): void;
  /** Whether a matching message was already received. */
  seen(pred: Pred): boolean;
}

export const type =
  (t: string): Pred =>
  (m) =>
    m.type === t;
export const phase =
  (p: string): Pred =>
  (m) =>
    m.type === "phase-change" && m.phase === p;
export const sleep = (ms: number) =>
  new Promise<void>((r) => setTimeout(r, ms));

/** A tiny valid PNG, used wherever a test needs to submit "a drawing". */
export const IMG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

/** A valid, blank PNG of the given size, as a data URL (the gallery only accepts 800×600). */
export function pngDataUrl(width: number, height: number): string {
  const chunk = (kind: string, data: Buffer) => {
    const body = Buffer.concat([Buffer.from(kind, "ascii"), data]);
    const head = Buffer.alloc(4);
    head.writeUInt32BE(data.length);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body));
    return Buffer.concat([head, body, crc]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header.set([8, 0, 0, 0, 0], 8); // 8-bit greyscale
  const rows = Buffer.alloc((width + 1) * height, 0xff);
  for (let y = 0; y < height; y++) rows[y * (width + 1)] = 0; // filter byte
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(rows)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
  return "data:image/png;base64," + png.toString("base64");
}

const open: TestClient[] = [];

/** Opens a raw socket to the server. It is not in any room yet. */
export function connect(url: string, name = "client"): Promise<TestClient> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    let waiters: ((m: Msg) => boolean)[] = [];
    const listeners: ((m: Msg) => void)[] = [];

    const c: TestClient = {
      name,
      ws,
      msgs: [],
      playerId: "",
      token: "",
      state: null,
      send: (message) => ws.send(JSON.stringify(message)),
      close: () => ws.close(),
      wait: (pred, timeoutMs = 5000) =>
        new Promise((res, rej) => {
          const timer = setTimeout(
            () =>
              rej(
                new Error(
                  `${name}: timed out after ${timeoutMs}ms waiting for ${pred}. Got: ${c.msgs.map((m) => m.type).join(", ")}`,
                ),
              ),
            timeoutMs,
          );
          waiters.push((m) => {
            if (!pred(m)) return false;
            clearTimeout(timer);
            res(m);
            return true;
          });
        }),
      on: (handler) => void listeners.push(handler),
      seen: (pred) => c.msgs.some(pred),
    };

    ws.on("message", (raw) => {
      const m = JSON.parse(raw.toString());
      c.msgs.push(m);
      if (m.type === "room-state") {
        c.playerId = m.playerId;
        c.state = m.state;
        if (m.sessionToken) c.token = m.sessionToken;
      }
      listeners.forEach((l) => l(m));
      waiters = waiters.filter((w) => !w(m));
    });
    ws.on("open", () => {
      open.push(c);
      resolve(c);
    });
    ws.on("error", reject);
  });
}

/** Connects and joins an existing room. Resolves once the server answered (room-state or error). */
export async function join(
  url: string,
  roomCode: string,
  nickname: string,
  accessToken?: string,
): Promise<TestClient> {
  const c = await connect(url, nickname);
  const answered = c.wait((m) => m.type === "room-state" || m.type === "error");
  c.send({ type: "join-room", roomCode, nickname, accessToken });
  await answered;
  return c;
}

/** Creates a room with `players` clients in it; `clients[0]` is the host. */
export async function createRoom(
  url: string,
  players: number,
  options: object = {},
) {
  const host = await connect(url, "p0");
  const created = host.wait(type("room-state"));
  host.send({ type: "create-room", nickname: "p0", ...options });
  const code: string = (await created).state.code;

  const clients = [host];
  for (let i = 1; i < players; i++)
    clients.push(await join(url, code, `p${i}`));
  return { code, clients };
}

/** Closes every socket opened through this module. */
export function closeAll() {
  for (const c of open.splice(0)) c.close();
}
