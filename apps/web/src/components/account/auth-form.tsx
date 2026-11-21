"use client";
import { useState } from "react";
import {
  accountErrorMessage,
  signInWithEmail,
  signInWithGoogle,
  signUpWithEmail,
} from "@/lib/account";
import { validateEmail, validatePassword } from "@/lib/account-rules";

const INPUT =
  "w-full px-4 py-3 bg-gray-800 rounded-xl border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500";

/** Sign in or sign up; where the player goes next is the page's business (it watches `useAccount`). */
export function AuthForm() {
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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

  return (
    <div className="w-full max-w-sm flex flex-col gap-4">
      <button
        onClick={google}
        className="w-full py-3 bg-white text-gray-900 hover:bg-gray-200 rounded-xl font-bold transition-colors"
      >
        Entrar com Google
      </button>

      <p className="text-center text-sm text-gray-500">ou com e-mail</p>

      <div className="flex gap-2" role="tablist">
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
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
              mode === id
                ? "bg-purple-600 text-white"
                : "bg-gray-800 text-gray-400 hover:bg-gray-700"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="flex flex-col gap-3" noValidate>
        <input
          type="email"
          placeholder="E-mail"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={INPUT}
        />
        <input
          type="password"
          placeholder="Senha"
          autoComplete={
            mode === "sign-up" ? "new-password" : "current-password"
          }
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={INPUT}
        />
        {mode === "sign-up" && (
          <>
            <input
              type="password"
              placeholder="Repita a senha"
              autoComplete="new-password"
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              className={INPUT}
            />
            <p className="text-xs text-gray-500">
              Guarde sua senha: ainda não há como recuperá-la.
            </p>
          </>
        )}
        <button
          type="submit"
          disabled={busy}
          className="w-full py-3 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-700 rounded-xl font-bold text-lg transition-colors"
        >
          {mode === "sign-up" ? "Criar conta" : "Entrar"}
        </button>
        {error && <p className="text-red-400 text-sm text-center">{error}</p>}
      </form>
    </div>
  );
}
