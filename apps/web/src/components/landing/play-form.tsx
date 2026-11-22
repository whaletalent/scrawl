"use client";
import { useState } from "react";
import { validateNickname } from "@/lib/room-utils";
import { BASE_PATH, NEW_ROOM, roomPath } from "@/lib/routes";
import type { FaceTemplateOption, GameMode } from "@/types/game";
import { FACE_TEMPLATE_LABELS, SKIN_TONES } from "@/components/face-templates";
import { CREATE_LABEL, storeRoomOptions } from "@/lib/room-options";

const MODES: { id: GameMode; label: string }[] = [
  { id: "party", label: "Racha-tema (4-10)" },
  { id: "split-body", label: "Monstrinho (2)" },
  { id: "face-builder", label: "Caricatura a dois (2)" },
];

const DURATIONS = [15, 30, 45, 60, 90, 120, 180];

/**
 * A full page load, not `router.push`: the landing's design kit must be gone
 * (styles and scripts) before any game screen renders.
 */
function leaveTo(path: string) {
  window.location.assign(`${BASE_PATH}${path}`);
}

/** Play right away with just a nickname: create a room, or join one by its code. */
export function PlayForm({
  children,
}: {
  /** Shown under the form until the player picks create or join. */
  children?: React.ReactNode;
}) {
  const [nickname, setNickname] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [step, setStep] = useState<"initial" | "create" | "join">("initial");
  const [error, setError] = useState<{
    field: "nickname" | "code";
    text: string;
  } | null>(null);
  const [gameMode, setGameMode] = useState<GameMode>("party");
  const [totalRounds, setTotalRounds] = useState(3);
  const [turnDuration, setTurnDuration] = useState(90);
  const [faceTemplate, setFaceTemplate] =
    useState<FaceTemplateOption>("random");
  const [skinTone, setSkinTone] = useState("#FDDCB5");

  function nicknameOk(): boolean {
    const text = validateNickname(nickname);
    if (text) setError({ field: "nickname", text });
    return !text;
  }

  function handleCreate() {
    if (!nicknameOk()) return;
    storeRoomOptions({
      nickname: nickname.trim(),
      gameMode,
      totalRounds,
      turnDuration,
      faceTemplate,
      skinTone,
      // Public rooms are for accounts.
      visibility: "private",
    });
    leaveTo(roomPath(NEW_ROOM));
  }

  function handleJoin() {
    if (!nicknameOk()) return;
    const code = roomCode.trim().toUpperCase();
    if (code.length < 5) {
      setError({ field: "code", text: "Digite um código de sala válido" });
      return;
    }
    sessionStorage.setItem("scrawl-nickname", nickname.trim());
    leaveTo(roomPath(code));
  }

  function submit() {
    if (step === "create") handleCreate();
    else if (step === "join") handleJoin();
  }

  const twoPlayers = gameMode !== "party";

  return (
    <div className="play-col">
      <div className="form play" role="group" aria-label="Jogar">
        <div className="field field--full">
          <label htmlFor="play-nickname">Apelido</label>
          <input
            id="play-nickname"
            type="text"
            placeholder="Seu apelido"
            autoComplete="nickname"
            value={nickname}
            maxLength={16}
            aria-invalid={error?.field === "nickname" || undefined}
            aria-describedby="play-nickname-err"
            onChange={(e) => {
              setNickname(e.target.value);
              setError(null);
            }}
            onKeyDown={(e) => e.key === "Enter" && submit()}
          />
          <p
            className="field__error"
            id="play-nickname-err"
            hidden={error?.field !== "nickname"}
          >
            {error?.field === "nickname" ? error.text : ""}
          </p>
        </div>

        {step === "initial" && (
          <div className="btn-row step">
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => setStep("create")}
            >
              Criar sala
            </button>
            <button
              type="button"
              className="btn btn--secondary"
              onClick={() => setStep("join")}
            >
              Entrar em sala
            </button>
          </div>
        )}

        {step === "create" && (
          <>
            <div className="field field--full step">
              <span id="play-mode">Modo</span>
              <div className="opt" role="group" aria-labelledby="play-mode">
                {MODES.map(({ id, label }) => (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={gameMode === id}
                    onClick={() => setGameMode(id)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {twoPlayers && (
              <div className="field">
                <span id="play-rounds">Rodadas</span>
                <div className="opt" role="group" aria-labelledby="play-rounds">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      aria-pressed={totalRounds === n}
                      onClick={() => setTotalRounds(n)}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className={twoPlayers ? "field" : "field field--full"}>
              <label htmlFor="play-duration">Tempo por turno</label>
              <select
                id="play-duration"
                value={turnDuration}
                onChange={(e) => setTurnDuration(Number(e.target.value))}
              >
                {DURATIONS.map((s) => (
                  <option key={s} value={s}>
                    {s >= 60 ? `${s / 60}min` : `${s}s`}
                  </option>
                ))}
              </select>
            </div>

            {gameMode === "face-builder" && (
              <div className="field field--full">
                <span id="play-template">Moldura</span>
                <div
                  className="opt"
                  role="group"
                  aria-labelledby="play-template"
                >
                  {(
                    Object.entries(FACE_TEMPLATE_LABELS) as [
                      FaceTemplateOption,
                      string,
                    ][]
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      aria-pressed={faceTemplate === id}
                      onClick={() => setFaceTemplate(id)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {gameMode === "face-builder" && faceTemplate !== "random" && (
              <div className="field field--full">
                <span id="play-skin">Tom de pele</span>
                <div
                  className="opt opt--swatch"
                  role="group"
                  aria-labelledby="play-skin"
                >
                  {SKIN_TONES.map((tone) => (
                    <button
                      key={tone.id}
                      type="button"
                      aria-label={tone.label}
                      aria-pressed={skinTone === tone.color}
                      onClick={() => setSkinTone(tone.color)}
                      style={{ backgroundColor: tone.color }}
                    />
                  ))}
                </div>
              </div>
            )}

            <div className="btn-row step">
              <button
                type="button"
                className="btn btn--primary"
                onClick={handleCreate}
              >
                {CREATE_LABEL[gameMode]}
              </button>
              <button
                type="button"
                className="btn btn--secondary"
                onClick={() => {
                  setStep("initial");
                  setError(null);
                }}
              >
                Voltar
              </button>
            </div>
          </>
        )}

        {step === "join" && (
          <>
            <div className="field field--full step">
              <label htmlFor="play-code">Código da sala</label>
              <input
                id="play-code"
                type="text"
                className="play__code"
                placeholder="Código da sala (ex.: ABC12)"
                autoComplete="off"
                autoCapitalize="characters"
                value={roomCode}
                maxLength={5}
                aria-invalid={error?.field === "code" || undefined}
                aria-describedby="play-code-err"
                onChange={(e) => {
                  setRoomCode(e.target.value.toUpperCase());
                  setError(null);
                }}
                onKeyDown={(e) => e.key === "Enter" && submit()}
              />
              <p
                className="field__error"
                id="play-code-err"
                hidden={error?.field !== "code"}
              >
                {error?.field === "code" ? error.text : ""}
              </p>
            </div>
            <div className="btn-row step">
              <button
                type="button"
                className="btn btn--primary"
                onClick={handleJoin}
              >
                Entrar
              </button>
              <button
                type="button"
                className="btn btn--secondary"
                onClick={() => {
                  setStep("initial");
                  setError(null);
                }}
              >
                Voltar
              </button>
            </div>
          </>
        )}
      </div>
      {step === "initial" && children}
    </div>
  );
}
