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
    <html lang="pt-BR">
      <body className="bg-gray-950 text-white min-h-screen">{children}</body>
    </html>
  );
}
