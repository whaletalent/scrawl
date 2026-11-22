"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "@phosphor-icons/react";
import { AccountPage } from "@/components/account/account-page";
import { AvatarEditor } from "@/components/account/avatar-editor";
import { signOutHere } from "@/components/account/account-menu";
import {
  accountErrorMessage,
  createProfile,
  isUsernameTaken,
} from "@/lib/account";
import { validateUsername } from "@/lib/account-rules";

/** Onboarding: every new account picks a username, then draws its avatar. */
export default function WelcomePage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [step, setStep] = useState<"username" | "avatar">("username");
  const [error, setError] = useState<string | null>(null);
  const [taken, setTaken] = useState(false);
  const editor = useRef<HTMLDivElement>(null);

  // The drawing step starts below the heading: bring the canvas into view.
  useEffect(() => {
    if (step === "avatar")
      editor.current?.querySelector("canvas")?.scrollIntoView({
        block: "nearest",
      });
  }, [step]);

  // Live "already taken" check, a moment after the player stops typing.
  useEffect(() => {
    setTaken(false);
    if (validateUsername(username)) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      const result = await isUsernameTaken(username);
      if (!cancelled) setTaken(result);
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [username]);

  async function next(e: React.FormEvent) {
    e.preventDefault();
    const invalid = validateUsername(username);
    if (invalid) {
      setError(invalid);
      return;
    }
    if (await isUsernameTaken(username)) {
      setTaken(true);
      return;
    }
    setError(null);
    setStep("avatar");
  }

  return (
    <AccountPage
      for="needs-profile"
      title={
        step === "username" ? "Escolha seu username" : "Desenhe seu avatar"
      }
      wide={step === "avatar"}
    >
      {({ refresh }) => (
        <>
          {/* Both steps stay mounted so going back to fix the username keeps the drawing. */}
          <form
            onSubmit={next}
            className={`w-full flex-col gap-4 ${step === "username" ? "flex" : "hidden"}`}
            noValidate
          >
            <p className="text-lg leading-normal">
              É o nome que os outros jogadores vão ver nas salas e nos desenhos
              da galeria. Não dá para trocar depois.
            </p>
            <input
              type="text"
              placeholder="Username"
              autoFocus
              autoComplete="off"
              maxLength={16}
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setError(null);
              }}
              aria-label="Username"
              className="w-full h-14 px-4 bg-soft border-b-4 border-ink font-semibold text-xl text-ink placeholder-faint focus:outline-none focus:border-brand"
            />
            <button
              type="submit"
              className="press min-h-15 px-7 flex items-center justify-between gap-4 bg-brand text-white hover:bg-brand-dark font-display font-extrabold text-2xl"
            >
              Continuar
              <ArrowRight aria-hidden="true" weight="bold" size={28} />
            </button>
            {(error || taken) && (
              <p className="text-red-600 font-semibold">
                {error ?? accountErrorMessage("username-taken")}
              </p>
            )}
          </form>

          <div
            ref={editor}
            className={`w-full flex-col items-start gap-5 ${step === "avatar" ? "flex" : "hidden"}`}
          >
            <p className="text-lg leading-normal">
              Vai ser a sua foto, <strong>{username}</strong>. Desenhe por cima
              do rosto como quiser.
            </p>
            <AvatarEditor
              saveLabel="Criar conta"
              onSave={async (png) => {
                const failed = await createProfile(username, png);
                if (failed === "username-taken") {
                  setTaken(true);
                  setStep("username");
                  return null;
                }
                if (failed) return accountErrorMessage(failed);
                await refresh();
                router.replace("/");
                return null;
              }}
            />
            <button
              onClick={() => setStep("username")}
              className="min-h-11 font-semibold underline"
            >
              Trocar username
            </button>
          </div>

          <button
            onClick={signOutHere}
            className="min-h-11 text-muted underline"
          >
            Sair
          </button>
        </>
      )}
    </AccountPage>
  );
}
