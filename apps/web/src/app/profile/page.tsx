"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { AccountPage } from "@/components/account/account-page";
import { Avatar } from "@/components/account/avatar";
import { OwnDrawings } from "@/components/gallery/own-drawings";
import { signOutHere } from "@/components/account/account-menu";
import {
  accountErrorMessage,
  changePassword,
  getOwnLogin,
} from "@/lib/account";
import { validatePassword } from "@/lib/account-rules";

const INPUT =
  "w-full px-4 py-3 bg-gray-800 rounded-xl border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500";

function PasswordForm() {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(
    null,
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const invalid = validatePassword(password, confirmation);
    if (invalid) {
      setMessage({ ok: false, text: invalid });
      return;
    }
    const failed = await changePassword(password);
    if (failed) {
      setMessage({ ok: false, text: accountErrorMessage(failed) });
      return;
    }
    setPassword("");
    setConfirmation("");
    setMessage({ ok: true, text: "Senha trocada" });
  }

  return (
    <form onSubmit={submit} className="w-full flex flex-col gap-3" noValidate>
      <h2 className="font-semibold">Trocar senha</h2>
      <input
        type="password"
        placeholder="Nova senha"
        autoComplete="new-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className={INPUT}
      />
      <input
        type="password"
        placeholder="Repita a nova senha"
        autoComplete="new-password"
        value={confirmation}
        onChange={(e) => setConfirmation(e.target.value)}
        className={INPUT}
      />
      <button
        type="submit"
        className="w-full py-2.5 bg-gray-700 hover:bg-gray-600 rounded-xl font-semibold transition-colors"
      >
        Trocar senha
      </button>
      {message && (
        <p
          className={`text-sm text-center ${message.ok ? "text-green-400" : "text-red-400"}`}
        >
          {message.text}
        </p>
      )}
    </form>
  );
}

export default function ProfilePage() {
  const [login, setLogin] =
    useState<Awaited<ReturnType<typeof getOwnLogin>>>(null);
  useEffect(() => {
    void getOwnLogin().then(setLogin);
  }, []);

  return (
    <AccountPage for="ready" title="Seu perfil">
      {({ profile }) =>
        profile && (
          <>
            <Avatar
              url={profile.avatarUrl}
              name={profile.username}
              size={160}
            />
            <div className="text-center">
              <p className="text-2xl font-bold">{profile.username}</p>
              {login?.email && (
                <p className="text-sm text-gray-500">
                  {login.email} (só você vê)
                </p>
              )}
            </div>
            <Link
              href="/avatar/"
              className="w-full py-2.5 text-center bg-purple-600 hover:bg-purple-500 rounded-xl font-semibold transition-colors"
            >
              Redesenhar avatar
            </Link>
            {login?.hasPassword && <PasswordForm />}
            <OwnDrawings userId={profile.userId} />
            <div className="flex gap-6 text-sm">
              <Link href="/" className="text-gray-400 hover:text-gray-200">
                Voltar
              </Link>
              <button
                onClick={signOutHere}
                className="text-gray-400 hover:text-gray-200"
              >
                Sair
              </button>
            </div>
          </>
        )
      }
    </AccountPage>
  );
}
