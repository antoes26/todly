import type { Metadata, Viewport } from "next";
import "./globals.css";
import { PwaSupport } from "./pwa-support";

export const metadata: Metadata = {
  title: "Todly · Il tuo spazio personale",
  description: "Le tue attività, i tuoi progetti, un unico posto ordinato.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Todly", statusBarStyle: "default" },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#ffffff",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it">
      <body className="antialiased"><PwaSupport />{children}</body>
    </html>
  );
}

