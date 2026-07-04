import type { Metadata } from "next";
import { IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ??
      (process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000"),
  ),
  title: "Dhaga — Every thread, remembered",
  description:
    "Dhaga turns every card scan, badge, and voice note into a private knowledge graph you can search in plain language. Open source. Your data stays yours.",
  keywords: [
    "personal CRM",
    "business card scanner",
    "networking app",
    "knowledge graph",
    "open source CRM",
  ],
  openGraph: {
    title: "Dhaga — Every thread, remembered",
    description:
      "Capture contacts anywhere. Ask your network questions. Get answers with receipts. Open source and private by design.",
    type: "website",
    siteName: "Dhaga",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${plexMono.variable} h-full antialiased`}>
      {/* Geist Pixel isn't in next/font/google's supported list yet, so it's
          loaded as a regular Google Fonts stylesheet via the root <head>. */}
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Geist+Pixel&display=swap"
          rel="stylesheet"
        />
      </head>
      {/* suppressHydrationWarning: browser extensions (Grammarly et al.)
          inject attributes into <body> before React hydrates; the warning is
          noise. Suppression is attribute-level and this element only. */}
      <body
        suppressHydrationWarning
        className="min-h-full flex flex-col bg-ink text-paper"
      >
        {children}
      </body>
    </html>
  );
}
