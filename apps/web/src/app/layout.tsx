import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Scrawl — Party Drawing Game",
  description: "Draw, laugh, compete. The party game where your terrible art becomes legendary.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-950 text-white min-h-screen">{children}</body>
    </html>
  );
}
