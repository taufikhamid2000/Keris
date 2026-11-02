import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Keris",
  description: "A stealth-parkour browser game set in Malacca, 1511. Built with three.js.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
