import type { Metadata } from "next";
import { Spectral, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const spectral = Spectral({
  variable: "--font-spectral",
  subsets: ["latin"],
  weight: ["400", "500"],
  style: ["normal", "italic"],
});

const plexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
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
      className={`${spectral.variable} ${plexSans.variable} ${plexMono.variable} h-full antialiased`}
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
