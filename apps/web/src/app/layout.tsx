import type { Metadata } from "next";
import "./globals.css";

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
      data-radius="round"
      data-buttons="solid"
      data-motion=""
      suppressHydrationWarning
    >
      <body className="bg-gray-950 text-white min-h-screen">{children}</body>
    </html>
  );
}
