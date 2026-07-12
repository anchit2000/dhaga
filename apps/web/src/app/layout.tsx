import type { Metadata } from "next";
import { IBM_Plex_Mono } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

// Geist Pixel isn't in next/font/google's supported list yet, so the single
// latin-subset weight is self-hosted here instead of loaded from a
// render-blocking Google Fonts <link> (see next/font/local docs).
const geistPixel = localFont({
  src: "./fonts/GeistPixel-latin.woff2",
  variable: "--font-geist-pixel",
  display: "swap",
  weight: "400",
  style: "normal",
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
    <html
      lang="en"
      className={`${plexMono.variable} ${geistPixel.variable} h-full antialiased`}
    >
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
