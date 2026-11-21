"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
            className={`w-full max-w-sm flex-col gap-3 ${step === "username" ? "flex" : "hidden"}`}
            noValidate
          >
            <p className="text-sm text-gray-400 text-center">
              É o nome que os outros jogadores vão ver. Não dá para trocar
              depois.
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
              className="w-full px-4 py-3 bg-gray-800 rounded-xl border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 text-center text-lg"
            />
            <button
              type="submit"
              className="w-full py-3 bg-purple-600 hover:bg-purple-500 rounded-xl font-bold text-lg transition-colors"
            >
              Continuar
            </button>
            {(error || taken) && (
              <p className="text-red-400 text-sm text-center">
                {error ?? accountErrorMessage("username-taken")}
              </p>
            )}
          </form>

          <div
            className={`w-full flex-col items-center gap-4 ${step === "avatar" ? "flex" : "hidden"}`}
          >
            <p className="text-sm text-gray-400 text-center">
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
              className="text-sm text-gray-500 hover:text-gray-300"
            >
              Trocar username
            </button>
          </div>

          <button
            onClick={signOutHere}
            className="text-sm text-gray-500 hover:text-gray-300"
          >
            Sair
          </button>
        </>
      )}
    </AccountPage>
  );
}
