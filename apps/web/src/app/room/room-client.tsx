"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useGameState, readSession } from "@/hooks/use-game-state";
import { GameController } from "@/components/game/game-controller";
import { validateNickname } from "@/lib/room-utils";
import { BASE_PATH, NEW_ROOM, roomPath } from "@/lib/routes";
import { useAccount } from "@/hooks/use-account";
import { getAccessToken } from "@/lib/account";
import { isOpen, onClose, onOpen } from "@/lib/ws-client";
import type { GameMode } from "@/types/game";

export function RoomClient() {
  const router = useRouter();
  // "new" to create a room, otherwise the code of the room to join.
  const code = useSearchParams().get("code")?.trim() ?? "";
  const gameState = useGameState();
  const account = useAccount();
  // Entering a room involves an async token read; never start it twice.
  const entering = useRef(false);
  // Whether the creator asked for a public room. Read once from the handoff
  // (and removed, so it can't leak into a later room), kept for retries.
  const wantsPublic = useRef<boolean | null>(null);

  // Enter only through a socket that is really open: the game server may be
  // waking up, and a request sent into a connection attempt that then fails
  // would be lost for good. Every time the socket (re)opens without us being
  // in a room, the effect below runs again.
  const [socketOpen, setSocketOpen] = useState(false);
  useEffect(() => {
    setSocketOpen(isOpen());
    const offOpen = onOpen(() => setSocketOpen(true));
    const offClose = onClose(() => {
      entering.current = false;
      setSocketOpen(false);
    });
    return () => {
      offOpen();
      offClose();
    };
  }, []);
  // Someone who opened an invite link directly never went through the landing
  // page, so they have no nickname yet — ask before joining.
  const [askNickname, setAskNickname] = useState(false);
  const [nickname, setNickname] = useState("");
  const [nicknameError, setNicknameError] = useState<string | null>(null);

  useEffect(() => {
    if (!code) {
      router.replace("/");
      return;
    }
    if (!socketOpen || gameState.roomState || gameState.sessionLost) return;

    // Reloaded (or came back to) a room this tab already has a slot in:
    // reclaim it instead of joining as a new player. If the server refuses,
    // `rejoinFailed` flips and this effect falls through to a normal join.
    const session = readSession();
    if (
      !gameState.rejoinFailed &&
      session &&
      session.code === code.toUpperCase()
    ) {
      gameState.rejoinRoom(session);
      return;
    }

    // Who is entering: an account (username, no prompt) or a guest (nickname).
    if (account.status === "loading") return;
    if (account.status === "needs-profile") {
      router.replace("/welcome/");
      return;
    }
    const nickname =
      account.profile?.username ?? sessionStorage.getItem("scrawl-nickname");
    if (!nickname) {
      setAskNickname(true);
      return;
    }
    if (entering.current) return;
    entering.current = true;
    void enter(nickname, account.profile !== null);
  }, [
    socketOpen,
    gameState.roomState,
    gameState.rejoinFailed,
    gameState.sessionLost,
    askNickname,
    account.status,
    account.profile,
    code,
    router,
  ]);

  async function enter(nickname: string, loggedIn: boolean) {
    // The token is what makes the server show the account instead of a guest.
    const accessToken = loggedIn
      ? ((await getAccessToken()) ?? undefined)
      : undefined;

    if (code === NEW_ROOM) {
      if (wantsPublic.current === null) {
        wantsPublic.current =
          sessionStorage.getItem("scrawl-visibility") === "public";
        sessionStorage.removeItem("scrawl-visibility");
      }
      const gameMode =
        (sessionStorage.getItem("scrawl-gameMode") as GameMode) || "party";
      const totalRounds = parseInt(
        sessionStorage.getItem("scrawl-totalRounds") || "3",
        10,
      );
      const turnDuration = parseInt(
        sessionStorage.getItem("scrawl-turnDuration") || "90",
        10,
      );
      const faceTemplate = (sessionStorage.getItem("scrawl-faceTemplate") ||
        "random") as import("@/types/game").FaceTemplateOption;
      const skinTone = sessionStorage.getItem("scrawl-skinTone") || "#FDDCB5";
      gameState.createRoom(
        nickname,
        gameMode,
        totalRounds,
        turnDuration,
        faceTemplate,
        skinTone,
        accessToken,
        wantsPublic.current ? "public" : "private",
      );
    } else {
      gameState.joinRoom(code, nickname, accessToken);
    }
  }

  // Once in a room the entry is over (a later drop is handled by rejoin).
  useEffect(() => {
    if (gameState.roomState) entering.current = false;
  }, [gameState.roomState]);

  // The server only lists rooms of players whose account it could confirm. If
  // it couldn't, the room exists but is private — say so instead of letting
  // the host wait for strangers who will never see it.
  const lobbyNotice =
    wantsPublic.current && gameState.roomState?.isPublic === false
      ? "Não deu para confirmar sua conta agora, então a sala ficou privada. Convide pelo link."
      : undefined;

  // The host lands on ?code=new; once the server assigns the real code,
  // put it in the URL so the address bar is a working invite link.
  const roomCode = gameState.roomState?.code;
  useEffect(() => {
    if (
      roomCode &&
      new URLSearchParams(window.location.search).get("code") !== roomCode
    ) {
      window.history.replaceState(
        null,
        "",
        `${BASE_PATH}${roomPath(roomCode)}`,
      );
    }
  }, [roomCode]);

  function submitNickname() {
    const err = validateNickname(nickname);
    if (err) {
      setNicknameError(err);
      return;
    }
    sessionStorage.setItem("scrawl-nickname", nickname.trim());
    setAskNickname(false);
  }

  if (askNickname && !gameState.roomState) {
    return (
      <main className="flex items-center justify-center min-h-screen px-4">
        <div className="sheet w-full max-w-lg flex flex-col gap-5 p-7 sm:p-12">
          <h1 className="text-4xl sm:text-5xl leading-none pr-10">
            {code === NEW_ROOM ? (
              "Criar sala"
            ) : (
              <>
                Entrar na sala{" "}
                <span className="text-brand">{code.toUpperCase()}</span>
              </>
            )}
          </h1>
          <input
            type="text"
            placeholder="Seu apelido"
            value={nickname}
            autoFocus
            onChange={(e) => {
              setNickname(e.target.value);
              setNicknameError(null);
            }}
            onKeyDown={(e) => e.key === "Enter" && submitNickname()}
            maxLength={16}
            aria-label="Seu apelido"
            className="w-full h-14 px-4 bg-soft border-b-4 border-ink font-semibold text-xl text-ink placeholder-faint focus:outline-none focus:border-brand"
          />
          <button
            onClick={submitNickname}
            className="press min-h-15 px-7 bg-brand text-white hover:bg-brand-dark font-display font-extrabold text-2xl"
          >
            Entrar
          </button>
          {nicknameError && (
            <p className="text-red-600 font-semibold">{nicknameError}</p>
          )}
        </div>
      </main>
    );
  }

  return <GameController {...gameState} lobbyNotice={lobbyNotice} />;
}
