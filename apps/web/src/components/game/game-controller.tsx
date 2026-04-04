"use client";
import { useGameState } from "@/hooks/use-game-state";
import { Lobby } from "@/components/lobby/lobby";
import { TimerBar } from "@/components/game/timer-bar";
import { Scoreboard } from "@/components/game/scoreboard";
import { ThemeCreation } from "@/components/phases/theme-creation";
import { ThemeVoting } from "@/components/phases/theme-voting";
import { DrawingPhase } from "@/components/phases/drawing-phase";
import { DrawingVoting } from "@/components/phases/drawing-voting";
import { Reveal } from "@/components/phases/reveal";

type GameControllerProps = ReturnType<typeof useGameState>;

export function GameController(props: GameControllerProps) {
  const { roomState, playerId, pairAssignment, drawings, error } = props;

  if (!roomState || !playerId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-400">Connecting...</p>
      </div>
    );
  }

  const currentPlayer = roomState.players.find((p) => p.id === playerId);
  const isHost = currentPlayer?.isHost ?? false;
  const phase = roomState.phase;

  return (
    <div className="min-h-screen flex flex-col">
      {phase !== "lobby" && phase !== "final-results" && (
        <div className="px-4 pt-4 flex items-center justify-between">
          <span className="text-sm text-gray-500">
            Round {roomState.round}/{roomState.totalRounds}
          </span>
          <TimerBar endsAt={roomState.phaseEndsAt} />
        </div>
      )}

      <div className="flex-1 flex items-center justify-center">
        {phase === "lobby" && (
          <Lobby
            roomCode={roomState.code}
            players={roomState.players}
            playerId={playerId}
            isHost={isHost}
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
            theme={pairAssignment.theme}
            side={pairAssignment.side}
            onSubmit={props.submitDrawing}
            endsAt={roomState.phaseEndsAt}
          />
        )}

        {phase === "drawing-voting" && (
          <DrawingVoting
            drawings={drawings}
            playerId={playerId}
            pairs={roomState.pairs}
            onVote={props.voteDrawing}
          />
        )}

        {phase === "reveal" && (
          <Reveal drawings={drawings} players={roomState.players} />
        )}

        {(phase === "scoreboard" || phase === "final-results") && (
          <Scoreboard
            players={roomState.players}
            isFinal={phase === "final-results"}
            drawings={drawings}
          />
        )}
      </div>
    </div>
  );
}
