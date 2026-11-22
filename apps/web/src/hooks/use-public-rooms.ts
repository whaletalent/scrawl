"use client";
import { useEffect, useState } from "react";
import {
  connect,
  disconnect,
  isOpen,
  onClose,
  onMessage,
  onOpen,
  send,
} from "@/lib/ws-client";
import type { PublicRoom } from "@/types/game";

interface PublicRooms {
  rooms: PublicRoom[];
  /** "connecting" until the server has answered — it may be waking up, which takes a while. */
  status: "connecting" | "ready";
}

/** The live list of open public rooms, for the home page. */
export function usePublicRooms(): PublicRooms {
  const [state, setState] = useState<PublicRooms>({
    rooms: [],
    status: "connecting",
  });

  useEffect(() => {
    const watch = () => send({ type: "watch-rooms" });
    // A fresh socket is unknown to the server: subscribe again on every (re)open.
    const offOpen = onOpen(watch);
    const offClose = onClose(() =>
      setState((s) => ({ ...s, status: "connecting" })),
    );
    const offMessage = onMessage((data) => {
      if (data.type === "public-rooms")
        setState({ rooms: data.rooms, status: "ready" });
    });

    connect(process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8080");
    if (isOpen()) watch();

    return () => {
      offOpen();
      offClose();
      offMessage();
      // The room page opens its own connection, as it always has.
      disconnect();
    };
  }, []);

  return state;
}
