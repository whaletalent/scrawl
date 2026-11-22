"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { AccountPage } from "@/components/account/account-page";
import { PencilSimple } from "@phosphor-icons/react";
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
  "w-full h-13 px-4 bg-soft border-b-4 border-ink font-medium text-lg text-ink placeholder-faint focus:outline-none focus:border-brand";

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
    <form
      onSubmit={submit}
      className="w-full max-w-md flex flex-col gap-3"
      noValidate
    >
      <h2 className="text-2xl sm:text-3xl">Trocar senha</h2>
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
        className="press self-start min-h-13 px-6 bg-white border-[3px] border-ink font-display font-extrabold text-xl"
      >
        Trocar senha
      </button>
      {message && (
        <p
          className={`font-semibold ${message.ok ? "text-go" : "text-red-600"}`}
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
    <AccountPage for="ready" title="Seu perfil" bare>
      {({ profile }) =>
        profile && (
          <div className="w-full flex flex-wrap items-start gap-8">
            <section className="taped shadow-hard-lg flex-[1_1_20rem] max-w-md min-w-0 flex flex-col items-start gap-4 bg-amber px-7 pt-11 pb-7">
              <span className="rounded-full border-[5px] border-ink bg-white">
                <Avatar
                  url={profile.avatarUrl}
                  name={profile.username}
                  size={160}
                />
              </span>
              <h1 className="text-3xl sm:text-4xl leading-none [overflow-wrap:anywhere]">
                {profile.username}
              </h1>
              {login?.email && <p>{login.email} (só você vê)</p>}
              <Link
                href="/avatar/"
                className="press self-stretch min-h-14 px-5 flex items-center justify-between gap-3 bg-ink text-paper font-display font-extrabold text-lg"
              >
                Redesenhar avatar
                <PencilSimple aria-hidden="true" weight="bold" size={26} />
              </Link>
              <div className="flex gap-6">
                <Link
                  href="/"
                  className="min-h-11 flex items-center font-semibold underline"
                >
                  Voltar
                </Link>
                <button
                  onClick={signOutHere}
                  className="min-h-11 font-semibold underline"
                >
                  Sair
                </button>
              </div>
            </section>

            <div className="sheet flex-[999_1_30rem] min-w-0 flex flex-col gap-10 p-6 sm:p-12">
              <OwnDrawings userId={profile.userId} />
              {login?.hasPassword && <PasswordForm />}
            </div>
          </div>
        )
      }
    </AccountPage>
  );
}
