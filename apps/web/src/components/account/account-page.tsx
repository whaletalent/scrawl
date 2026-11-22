"use client";
import { useEffect } from "react";
import Link from "next/link";
import { Wordmark } from "@/components/brand/wordmark";
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
  bare,
  children,
}: {
  for: AccountStatus;
  title: string;
  wide?: boolean;
  /** The page draws its own sheet and heading (the login page). */
  bare?: boolean;
  children: (account: ReturnType<typeof useAccount>) => React.ReactNode;
}) {
  const router = useRouter();
  const account = useAccount();
  const elsewhere = account.status === allowed ? null : HOME_OF[account.status];

  useEffect(() => {
    if (elsewhere) router.replace(elsewhere);
  }, [elsewhere, router]);

  return (
    <main className="min-h-screen flex flex-col items-center gap-8 px-4 sm:px-8 lg:px-14 pt-8 pb-14">
      <div className="self-stretch flex flex-wrap items-center justify-between gap-4">
        <Link href="/">
          <Wordmark large />
        </Link>
        {allowed === "signed-out" && (
          <Link
            href="/"
            className="tag min-h-11 px-4 flex items-center font-semibold hover:text-brand"
          >
            Jogar sem conta
          </Link>
        )}
      </div>
      {account.status !== allowed ? (
        <p className="tag px-4 py-2 text-muted">Carregando...</p>
      ) : bare ? (
        children(account)
      ) : (
        <div
          className={`sheet w-full flex flex-col items-start gap-6 p-6 sm:p-12 ${wide ? "max-w-4xl" : "max-w-xl"}`}
        >
          <h1 className="text-4xl sm:text-6xl leading-none pr-10">{title}</h1>
          {children(account)}
        </div>
      )}
    </main>
  );
}
