import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Todly · Il tuo spazio personale",
  description: "Le tue attività, i tuoi progetti, un unico posto ordinato.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it">
      <body className="antialiased">{children}</body>
    </html>
  );
}
