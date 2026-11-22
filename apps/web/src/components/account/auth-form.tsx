"use client";
import { useEffect, useState } from "react";
import {
  accountErrorMessage,
  canSignInWithGoogle,
  signInWithEmail,
  signInWithGoogle,
  signUpWithEmail,
} from "@/lib/account";
import { ArrowRight } from "@phosphor-icons/react";
import { art } from "@/components/brand/art";
import {
  MIN_PASSWORD_LENGTH,
  validateEmail,
  validatePassword,
} from "@/lib/account-rules";

const FIELD = "flex flex-col gap-2 font-display font-bold text-lg";
const INPUT =
  "w-full h-14 px-4 bg-soft border-b-4 border-ink font-sans font-medium text-lg text-ink placeholder-faint focus:outline-none focus:border-brand";
const NOTE = "font-sans font-normal text-sm text-muted";

/** What creating an account takes; the last two happen on /welcome/. */
const SIGN_UP_STEPS = [
  "E-mail e senha, ou a conta do Google",
  "Escolha o username que aparece nas salas e nos desenhos.",
  "Desenhe o seu avatar, com as mesmas ferramentas do jogo.",
];

/** Google's "G", in its own colours, as its sign-in buttons must show it. */
function GoogleMark() {
  return (
    <svg aria-hidden="true" width="24" height="24" viewBox="0 0 48 48">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}

/** Sign in or sign up; where the player goes next is the page's business (it watches `useAccount`). */
export function AuthForm() {
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Hidden until the project says Google sign-in is on.
  const [withGoogle, setWithGoogle] = useState(false);
  useEffect(() => {
    void canSignInWithGoogle().then(setWithGoogle);
  }, []);

  function switchTo(next: "sign-in" | "sign-up") {
    setMode(next);
    setError(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    const invalid =
      validateEmail(email) ??
      (mode === "sign-up" ? validatePassword(password, confirmation) : null);
    if (invalid) {
      setError(invalid);
      return;
    }
    setBusy(true);
    setError(null);
    const failed =
      mode === "sign-up"
        ? await signUpWithEmail(email, password)
        : await signInWithEmail(email, password);
    if (failed) setError(accountErrorMessage(failed));
    setBusy(false);
  }

  async function google() {
    setError(null);
    const failed = await signInWithGoogle();
    if (failed) setError(accountErrorMessage(failed));
  }

  const signUp = mode === "sign-up";

  return (
    <div className="w-full max-w-5xl flex flex-col">
      {/* Notebook tabs: the one on show is the taller, amber one. */}
      <div
        className="flex flex-wrap items-end gap-3 pl-3 sm:pl-10"
        role="tablist"
      >
        {(
          [
            ["sign-in", "Entrar"],
            ["sign-up", "Criar conta"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            role="tab"
            aria-selected={mode === id}
            onClick={() => switchTo(id)}
            className={`font-display font-extrabold px-7 ${
              mode === id
                ? "min-h-16 bg-amber text-ink text-3xl"
                : "min-h-14 bg-paper-deep text-brand text-2xl hover:bg-paper"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="sheet flex flex-wrap items-start gap-x-14 gap-y-10 p-6 sm:p-12">
        <div className="flex-1 basis-80 min-w-0 flex flex-col gap-5">
          <img
            src={art(signUp ? "mascot-flyer-sm" : "mascot-rocket-sm")}
            alt=""
            className={signUp ? "w-48 h-auto" : "w-full max-w-sm h-auto"}
          />
          <h1 className="text-4xl sm:text-6xl leading-none max-w-[12ch]">
            {signUp ? "Sua conta em 3 passos" : "Que bom te ver de novo"}
          </h1>
          {signUp ? (
            <ol className="flex flex-col gap-3">
              {SIGN_UP_STEPS.map((step, i) => (
                <li
                  key={step}
                  className={`flex items-center gap-4 px-4 py-3 ${i === 0 ? "bg-amber shadow-hard" : "bg-paper-deep"}`}
                >
                  <span
                    aria-hidden="true"
                    className={`flex-none w-11 h-11 rounded-full grid place-items-center font-display font-extrabold text-xl ${i === 0 ? "bg-ink text-paper" : "bg-paper border-[3px] border-ink"}`}
                  >
                    {i + 1}
                  </span>
                  <span
                    className={
                      i === 0
                        ? "font-display font-bold text-xl leading-tight"
                        : "text-lg leading-snug"
                    }
                  >
                    {step}
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-lg leading-normal max-w-[34ch]">
              Com a conta você abre salas públicas e guarda os desenhos na
              galeria, com o seu nome e o seu avatar.
            </p>
          )}
        </div>

        <div className="flex-1 basis-80 min-w-0 flex flex-col gap-5">
          {withGoogle && (
            <>
              <button
                onClick={google}
                className="press w-full min-h-15 px-6 flex items-center justify-center gap-3 bg-white text-ink border-[3px] border-ink font-display font-bold text-xl sm:text-[1.375rem]"
              >
                <GoogleMark />
                {signUp ? "Criar conta com Google" : "Entrar com Google"}
              </button>

              <p className="flex items-center gap-3 text-[0.9375rem] text-muted">
                <span aria-hidden="true" className="flex-1 h-[3px] bg-line" />
                ou com e-mail
                <span aria-hidden="true" className="flex-1 h-[3px] bg-line" />
              </p>
            </>
          )}

          <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
            <label className={FIELD}>
              E-mail
              <input
                type="email"
                placeholder="E-mail"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={INPUT}
              />
              {signUp && (
                <span className={NOTE}>
                  Só você vê. Os outros jogadores veem o username.
                </span>
              )}
            </label>
            <label className={FIELD}>
              Senha
              <input
                type="password"
                placeholder="Senha"
                autoComplete={signUp ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={INPUT}
              />
              {signUp && (
                <span className={NOTE}>
                  Pelo menos {MIN_PASSWORD_LENGTH} caracteres. Guarde sua senha:
                  ainda não há como recuperá-la.
                </span>
              )}
            </label>
            {signUp && (
              <label className={FIELD}>
                Repita a senha
                <input
                  type="password"
                  placeholder="Repita a senha"
                  autoComplete="new-password"
                  value={confirmation}
                  onChange={(e) => setConfirmation(e.target.value)}
                  className={INPUT}
                />
              </label>
            )}
            <button
              type="submit"
              disabled={busy}
              className="press w-full min-h-16 px-7 flex items-center justify-between gap-4 bg-brand text-white hover:bg-brand-dark disabled:bg-soft disabled:text-faint font-display font-extrabold text-2xl"
            >
              {signUp ? "Criar conta" : "Entrar"}
              <ArrowRight aria-hidden="true" weight="bold" size={28} />
            </button>
            {error && <p className="text-red-600 font-semibold">{error}</p>}
          </form>
        </div>
      </div>
    </div>
  );
}
