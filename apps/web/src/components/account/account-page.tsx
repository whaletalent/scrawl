"use client";
import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAccount, type AccountStatus } from "@/hooks/use-account";

/** Where each account state belongs when it lands on a page that isn't for it. */
const HOME_OF: Record<AccountStatus, string | null> = {
  off: "/",
  loading: null,
  "signed-out": "/login/",
  "needs-profile": "/welcome/",
  ready: "/",
};

/**
 * Frame for the account pages. The site is a static export, so each page
 * guards itself in the browser: it renders `children` only while the account
 * is in the state the page is `for`, and sends everybody else where they belong.
 */
export function AccountPage({
  for: allowed,
  title,
  wide,
  children,
}: {
  for: AccountStatus;
  title: string;
  wide?: boolean;
  children: (account: ReturnType<typeof useAccount>) => React.ReactNode;
}) {
  const router = useRouter();
  const account = useAccount();
  const elsewhere = account.status === allowed ? null : HOME_OF[account.status];

  useEffect(() => {
    if (elsewhere) router.replace(elsewhere);
  }, [elsewhere, router]);

  return (
    <main className="min-h-screen flex flex-col items-center gap-6 px-4 py-8">
      <Link
        href="/"
        className="text-3xl font-black tracking-tight bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent"
      >
        Scrawl
      </Link>
      {account.status === allowed ? (
        <div
          className={`w-full flex flex-col items-center gap-6 ${wide ? "max-w-3xl" : "max-w-sm"}`}
        >
          <h1 className="text-2xl font-bold text-center">{title}</h1>
          {children(account)}
        </div>
      ) : (
        <p className="text-gray-400">Carregando...</p>
      )}
    </main>
  );
}
