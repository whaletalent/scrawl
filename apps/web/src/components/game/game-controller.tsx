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

type GameControllerProps = ReturnType<typeof useGameState>;

export function GameController(props: GameControllerProps) {
  const { roomState, playerId, pairAssignment, drawings, error, notice } =
    props;

  if (!roomState || !playerId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        {error ? (
          <div className="flex flex-col items-center gap-3">
            <p className="text-red-400">{error}</p>
            <Link
              href="/"
              className="text-sm text-gray-400 hover:text-gray-300 underline"
            >
              Voltar
            </Link>
          </div>
        ) : (
          <p className="text-gray-400">Conectando...</p>
        )}
      </div>
    );
  }

  const currentPlayer = roomState.players.find((p) => p.id === playerId);
  const away = roomState.players
    .filter((p) => p.connected === false)
    .map((p) => p.nickname);
  const isHost = currentPlayer?.isHost ?? false;
  const phase = roomState.phase;

  return (
    <div className="min-h-screen flex flex-col">
      {phase !== "lobby" &&
        phase !== "final-results" &&
        phase !== "split-final" &&
        phase !== "face-final" && (
          <div className="px-4 pt-4 flex items-center justify-between">
            <span className="text-sm text-gray-500">
              Rodada {roomState.round}/{roomState.totalRounds}
            </span>
            <TimerBar endsAt={roomState.phaseEndsAt} />
          </div>
        )}

      {notice && (
        <p className="mx-4 mt-4 px-4 py-2 rounded-lg bg-yellow-600/20 text-yellow-300 text-sm text-center">
          {notice}
        </p>
      )}

      {away.length > 0 && phase !== "lobby" && (
        <p className="mx-4 mt-4 px-4 py-2 rounded-lg bg-gray-800 text-gray-300 text-sm text-center">
          {away.join(", ")}{" "}
          {away.length === 1 ? "desconectou" : "desconectaram"} — aguardando
          reconexão...
        </p>
      )}

      <div className="flex-1 flex items-center justify-center">
        {phase === "lobby" && (
          <Lobby
            roomCode={roomState.code}
            players={roomState.players}
            playerId={playerId}
            isHost={isHost}
            gameMode={roomState.gameMode ?? "party"}
            faceTemplate={roomState.faceTemplate}
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
            onSubmit={props.submitDrawing}
            endsAt={roomState.phaseEndsAt}
          />
        )}

        {phase === "drawing" && !pairAssignment && (
          <div className="text-center px-4">
            <h2 className="text-xl font-bold">Você é o jurado desta rodada</h2>
            <p className="text-gray-400 text-sm mt-1">
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
          />
        )}

        {phase === "split-drawing" && props.splitSide && props.silhouetteId && (
          <SplitDrawingPhase
            key={`split-${props.splitRound}-${props.splitSide}`}
            initialSubmitted={props.roundSubmitted}
            round={props.splitRound}
            totalRounds={roomState.totalRounds}
            side={props.splitSide}
            silhouetteId={props.silhouetteId}
            endsAt={roomState.phaseEndsAt}
            onSubmit={props.submitSplitDrawing}
          />
        )}

        {phase === "split-final" && (
          <SplitReveal drawings={props.splitDrawings} />
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
            />
          )}

        {phase === "face-final" && <FaceReveal drawings={props.faceDrawings} />}
      </div>
    </div>
  );
}
