"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Hero } from "@/components/landing/hero";
import { Home } from "@/components/home/home";
import { useAccount } from "@/hooks/use-account";

/**
 * One address, two pages: the logged-in home, or the landing page for
 * everybody else. The site is static, so the choice is made in the browser
 * once the session is known — never a flash of the wrong one.
 */
export default function Page() {
  const router = useRouter();
  const { status, profile } = useAccount();

  // An account without a username and avatar has to finish onboarding first.
  useEffect(() => {
    if (status === "needs-profile") router.replace("/welcome/");
  }, [status, router]);

  if (status === "ready" && profile) return <Home profile={profile} />;

  return (
    <main className="flex items-center justify-center min-h-screen">
      {status === "loading" || status === "needs-profile" ? (
        <p className="text-gray-400">Carregando...</p>
      ) : (
        <Hero signInLink={status === "signed-out"} />
      )}
    </main>
  );
}
