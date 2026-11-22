"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Landing } from "@/components/landing/landing";
import { Home } from "@/components/home/home";
import { useAccount } from "@/hooks/use-account";

/**
 * One address, two pages: the logged-in home, or the landing page for
 * everybody else. The site is static, so the choice is made in the browser
 * once the session is known. Until then the landing is in the page but
 * invisible — never a flash of the wrong one.
 */
export function Entry() {
  const router = useRouter();
  const { status, profile } = useAccount();

  // An account without a username and avatar has to finish onboarding first.
  useEffect(() => {
    if (status === "needs-profile") router.replace("/welcome/");
  }, [status, router]);

  if (status === "ready" && profile) return <Home profile={profile} />;

  return (
    <Landing
      pending={status === "loading" || status === "needs-profile"}
      signInLink={status === "signed-out"}
      gallery={status !== "off"}
    />
  );
}
