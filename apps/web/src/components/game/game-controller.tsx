"use client";
import Link from "next/link";
import { useGameState } from "@/hooks/use-game-state";
import { Lobby } from "@/components/lobby/lobby";
import { TimerBar } from "@/components/game/timer-bar";
import { Scoreboard } from "@/components/game/scoreboard";
import { ThemeCreation } from "@/components/phases/theme-creation";
import { ThemeVoting } from "@/components/phases/theme-voting";
import { DrawingPhase } from "@/components/phases/drawing-phase";
import { DrawingVoting } from "@/components/phases/drawing-voting";
import { Reveal } from "@/components/phases/reveal";
import { SplitDrawingPhase } from "@/components/phases/split-drawing-phase";
import { SplitReveal } from "@/components/phases/split-reveal";
import { FaceDrawingPhase } from "@/components/phases/face-drawing-phase";
import { FaceReveal } from "@/components/phases/face-reveal";
import { SeamDrawingPhase } from "@/components/phases/seam-drawing-phase";
import { SeamFinal, SeamRoundReveal } from "@/components/phases/seam-reveal";
import type { GallerySaving } from "@/components/gallery/save-button";

type GameControllerProps = ReturnType<typeof useGameState> & {
  /** Something the room page needs the host to know while in the lobby. */
  lobbyNotice?: string;
};

export function GameController(props: GameControllerProps) {
  const {
    roomState,
    playerId,
    pairAssignment,
    seamRound,
    drawings,
    error,
    notice,
  } = props;

  if (!roomState || !playerId) {
    return (
      <div className="flex items-center justify-center min-h-screen px-4">
        {error ? (
          <div className="sheet w-full max-w-md flex flex-col items-start gap-4 p-8 sm:p-10">
            <p className="text-red-600 font-display font-bold text-2xl leading-tight pr-8">
              {error}
            </p>
            <Link
              href="/"
              className="press min-h-12 px-6 flex items-center bg-brand text-white hover:bg-brand-dark font-display font-bold text-lg"
            >
              Voltar
            </Link>
          </div>
        ) : (
          <p className="tag px-6 py-4 font-display font-bold text-xl">
            Conectando...
          </p>
        )}
      </div>
    );
  }

  const currentPlayer = roomState.players.find((p) => p.id === playerId);
  const saving: GallerySaving = {
    saved: props.savedDrawings,
    failed: props.saveFailures,
    save: props.saveDrawing,
  };
  const away = roomState.players
    .filter((p) => p.connected === false)
    .map((p) => p.nickname);
  const isHost = currentPlayer?.isHost ?? false;
  const phase = roomState.phase;

  // These phases lay out their own papers on the desk; every other phase
  // gets one sheet to stand on.
  const ownPapers =
    phase === "lobby" ||
    (phase === "drawing" && !!pairAssignment) ||
    phase === "split-drawing" ||
    phase === "face-drawing" ||
    phase === "scoreboard" ||
    phase === "final-results" ||
    phase === "split-final" ||
    phase === "face-final" ||
    phase === "seam-drawing" ||
    phase === "seam-final";

  // The drawing screens carry the round and the timer in their own header.
  const ownHeader =
    (phase === "drawing" && !!pairAssignment) ||
    phase === "split-drawing" ||
    phase === "face-drawing" ||
    phase === "seam-drawing";
  const me = {
    name: currentPlayer?.nickname ?? "Você",
    avatarUrl: currentPlayer?.avatarUrl,
  };
  const partnerOf = (id: string | undefined) => {
    const p = roomState.players.find((q) =>
      id ? q.id === id : q.id !== playerId,
    );
    return { name: p?.nickname ?? "Parceiro", avatarUrl: p?.avatarUrl };
  };

  // The pair left to right: player A ("left") is member 0.
  const pairMembers = (a: { partnerId: string; side: "left" | "right" }) => {
    const mine = { id: playerId, nickname: me.name };
    const theirs = { id: a.partnerId, nickname: partnerOf(a.partnerId).name };
    return a.side === "left" ? [mine, theirs] : [theirs, mine];
  };

  return (
    <div className="min-h-screen flex flex-col gap-5 px-4 sm:px-8 lg:px-14 pt-6 pb-12">
      {phase !== "lobby" &&
        !ownHeader &&
        phase !== "final-results" &&
        phase !== "split-final" &&
        phase !== "face-final" &&
        phase !== "seam-final" && (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="tag min-h-12 px-5 flex items-center font-display font-bold text-lg">
              Rodada {roomState.round} de {roomState.totalRounds}
            </span>
            <TimerBar endsAt={roomState.phaseEndsAt} />
          </div>
        )}

      {notice && (
        <p className="tag self-center px-5 py-3 bg-amber font-semibold text-center">
          {notice}
        </p>
      )}

      {away.length > 0 && phase !== "lobby" && (
        <p className="tag self-center px-5 py-3 text-center">
          {away.join(", ")}{" "}
          {away.length === 1 ? "desconectou" : "desconectaram"} — aguardando
          reconexão...
        </p>
      )}

      <div className="flex-1 flex items-start justify-center">
        <div
          className={
            ownPapers
              ? "w-full flex justify-center"
              : "sheet w-full max-w-6xl flex justify-center px-5 py-8 sm:p-12"
          }
        >
          {phase === "lobby" && (
            <Lobby
              roomCode={roomState.code}
              players={roomState.players}
              playerId={playerId}
              isHost={isHost}
              gameMode={roomState.gameMode ?? "party"}
              faceTemplate={roomState.faceTemplate}
              isPublic={roomState.isPublic}
              notice={props.lobbyNotice}
              onStart={props.startGame}
              error={error}
            />
          )}

          {phase === "theme-creation" && (
            <ThemeCreation
              themes={roomState.themes}
              playerId={playerId}
              playerCount={roomState.players.length}
              onSubmit={props.submitTheme}
            />
          )}

          {phase === "theme-voting" && (
            <ThemeVoting
              themes={roomState.themes}
              playerId={playerId}
              onVote={props.voteTheme}
            />
          )}

          {phase === "drawing" && pairAssignment && (
            <DrawingPhase
              initialSubmitted={props.roundSubmitted}
              theme={pairAssignment.theme}
              side={pairAssignment.side}
              members={pairMembers(pairAssignment)}
              frames={props.stripFrames}
              onStripFrame={(strip, image) =>
                props.sendStripFrame(roomState.round, strip, image)
              }
              resync={pairAssignment}
              onSubmit={props.submitDrawing}
              timeUp={props.timeUp}
              mineReceived={props.mineReceived}
              partnerReceived={props.partnerReceived}
              endsAt={roomState.phaseEndsAt}
              round={roomState.round}
              totalRounds={roomState.totalRounds}
              me={me}
              partner={partnerOf(pairAssignment.partnerId)}
            />
          )}

          {phase === "drawing" && !pairAssignment && (
            <div className="w-full flex flex-col gap-4">
              <h2 className="text-3xl sm:text-5xl leading-none pr-10">
                Você é o jurado desta rodada
              </h2>
              <p className="text-lg leading-normal max-w-[52ch]">
                O número de jogadores é ímpar, então alguém fica de fora a cada
                rodada. Você vota em todos os desenhos quando o tempo acabar.
              </p>
            </div>
          )}

          {phase === "drawing-voting" && (
            <DrawingVoting
              drawings={drawings}
              ownPairId={pairAssignment?.pairId ?? null}
              onVote={props.voteDrawing}
            />
          )}

          {phase === "reveal" && <Reveal drawings={drawings} />}

          {(phase === "scoreboard" || phase === "final-results") && (
            <Scoreboard
              players={roomState.players}
              isFinal={phase === "final-results"}
              drawings={drawings}
              saving={saving}
              round={roomState.round}
              totalRounds={roomState.totalRounds}
              isHost={isHost}
              onPlayAgain={props.playAgain}
            />
          )}

          {phase === "split-drawing" &&
            props.splitSide &&
            props.silhouetteId && (
              <SplitDrawingPhase
                key={`split-${props.splitRound}-${props.splitSide}`}
                initialSubmitted={props.roundSubmitted}
                round={props.splitRound}
                totalRounds={roomState.totalRounds}
                side={props.splitSide}
                silhouetteId={props.silhouetteId}
                endsAt={roomState.phaseEndsAt}
                onSubmit={props.submitSplitDrawing}
                timeUp={props.timeUp}
                mineReceived={props.mineReceived}
                partnerReceived={props.partnerReceived}
                me={me}
                partner={partnerOf(undefined)}
              />
            )}

          {phase === "split-final" && (
            <SplitReveal
              drawings={props.splitDrawings}
              players={roomState.players}
              saving={saving}
              isHost={isHost}
              onPlayAgain={props.playAgain}
            />
          )}

          {phase === "face-drawing" &&
            props.faceRegions.length > 0 &&
            props.faceTemplate && (
              <FaceDrawingPhase
                key={`face-${props.faceRound}`}
                initialSubmitted={props.roundSubmitted}
                round={props.faceRound}
                totalRounds={roomState.totalRounds}
                regions={props.faceRegions}
                faceTemplate={props.faceTemplate}
                skinTone={props.faceSkinTone ?? roomState.skinTone}
                endsAt={roomState.phaseEndsAt}
                onSubmit={props.submitFaceDrawing}
                timeUp={props.timeUp}
                mineReceived={props.mineReceived}
                partnerReceived={props.partnerReceived}
                me={me}
                partner={partnerOf(undefined)}
              />
            )}

          {phase === "face-final" && (
            <FaceReveal
              drawings={props.faceDrawings}
              players={roomState.players}
              saving={saving}
              isHost={isHost}
              onPlayAgain={props.playAgain}
            />
          )}

          {/* The canvas mounts once this round's group is known: it takes
              its kept strip frames from the first frames it sees. */}
          {phase === "seam-drawing" &&
            seamRound &&
            seamRound.round === roomState.round && (
              <SeamDrawingPhase
                key={`seam-${seamRound.round}`}
                initialSubmitted={props.roundSubmitted}
                round={seamRound.round}
                totalRounds={seamRound.totalRounds}
                members={seamRound.members.map((m) => ({
                  ...m,
                  avatarUrl: roomState.players.find((p) => p.id === m.id)
                    ?.avatarUrl,
                }))}
                index={seamRound.index}
                received={props.seamReceived}
                frames={props.stripFrames}
                onStripFrame={(strip, image) =>
                  props.sendStripFrame(seamRound.round, strip, image)
                }
                resync={seamRound}
                onSubmit={props.submitSeamDrawing}
                timeUp={props.timeUp}
                mineReceived={props.mineReceived}
                endsAt={roomState.phaseEndsAt}
              />
            )}

          {phase === "seam-reveal" && props.seamResults && (
            <SeamRoundReveal drawings={props.seamResults.drawings} />
          )}

          {phase === "seam-final" && (
            <SeamFinal
              drawings={props.seamFinal?.drawings ?? []}
              players={roomState.players}
              saving={saving}
              isHost={isHost}
              onPlayAgain={props.playAgain}
            />
          )}
        </div>
      </div>
    </div>
  );
}
