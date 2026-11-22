import type { Metadata, Viewport } from "next";
import { Entry } from "@/components/landing/entry";
import { BASE_PATH } from "@/lib/routes";

const TITLE =
  "Scrawl: party game de desenho para jogar com amigos no navegador";
const DESCRIPTION =
  "Crie uma sala, mande o link e desenhe em dupla com 2 a 10 amigos. Três modos de jogo, sem instalar nada e sem precisar de conta.";

// Link previews need absolute picture addresses: set NEXT_PUBLIC_SITE_URL to
// the site's public origin at build time (e.g. https://user.github.io).
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL;

export const metadata: Metadata = {
  metadataBase: SITE_URL ? new URL(SITE_URL) : undefined,
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    type: "website",
    title: TITLE,
    description: DESCRIPTION,
    images: [`${BASE_PATH}/landing/share.jpg`],
  },
  twitter: { card: "summary_large_image" },
  // Read by the landing's design checks (see public/assets/README.md).
  other: { "site-kind": "gaming", "page-type": "software" },
};

export const viewport: Viewport = {
  themeColor: "#fff8e4",
  viewportFit: "cover",
};

export default function Page() {
  return <Entry />;
}
