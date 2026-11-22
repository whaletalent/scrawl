import type { Metadata } from "next";
import "./globals.css";
import { DeskTrail } from "@/components/brand/desk-trail";

export const metadata: Metadata = {
  title: "Scrawl — Party game de desenho",
  description:
    "Desenhe, ria, dispute. O party game em que a sua arte horrível vira lenda.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // The data attributes configure the landing page's design kit (see
    // components/landing/kit.tsx); without its stylesheets they do nothing.
    // The kit also adds classes to <html> before React hydrates.
    <html
      lang="pt-BR"
      data-type="software"
      data-radius="sharp"
      data-buttons="solid"
      data-motion=""
      suppressHydrationWarning
    >
      <body className="desk text-ink min-h-screen">
        <DeskTrail />
        {children}
      </body>
    </html>
  );
}
