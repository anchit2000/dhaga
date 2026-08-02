import type { Metadata, Viewport } from "next";
import {
  IBM_Plex_Mono,
  Inter,
  Lato,
  Montserrat,
  Open_Sans,
  Poppins,
  Roboto,
} from "next/font/google";
import localFont from "next/font/local";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { ThemeProvider } from "next-themes";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { Toaster } from "@/components/ui/sonner";
import { SiteStructuredData } from "@/components/seo/site-structured-data";
import { SITE_URL } from "@/utils/constants/site";
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

// Optional /app body faces (utils/constants/theme/fonts.ts). Every one is
// `preload: false` on purpose: a user on the default Geist Pixel must download
// none of them, and the browser only fetches a face once something actually
// resolves to it — which happens only when that user's theme rule points
// --font-sans at its variable. The variable names must stay in step with
// THEME_FONT_VARS in utils/constants/theme/fonts.ts; next/font requires
// explicitly written literals here, so they cannot be imported (a test pins
// them). Variable-font form (no `weight`) wherever Google ships one; Lato and
// Poppins have no variable axis, so they name their weights.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
  preload: false,
});

const roboto = Roboto({
  variable: "--font-roboto",
  subsets: ["latin"],
  display: "swap",
  preload: false,
});

const openSans = Open_Sans({
  variable: "--font-open-sans",
  subsets: ["latin"],
  display: "swap",
  preload: false,
});

const lato = Lato({
  variable: "--font-lato",
  subsets: ["latin"],
  display: "swap",
  preload: false,
  weight: ["400", "700"],
});

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  display: "swap",
  preload: false,
});

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  display: "swap",
  preload: false,
  weight: ["400", "600"],
});

const themeFontVariables = [
  inter.variable,
  roboto.variable,
  openSans.variable,
  lato.variable,
  montserrat.variable,
  poppins.variable,
].join(" ");

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ??
      (process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000"),
  ),
  title: "Dhaga — a private relationship memory for your network",
  description:
    "Capture meetings, notes, messages, introductions, voice memos, and cards. Dhaga keeps the context searchable and helps you follow up. Open source and private by design.",
  keywords: [
    "personal CRM",
    "relationship management",
    "contact notes",
    "business card scanner",
    "knowledge graph",
    "open source CRM",
  ],
  alternates: {
    canonical: SITE_URL,
  },
  openGraph: {
    title: "Dhaga — a private relationship memory for your network",
    description:
      "Remember the context behind every relationship, search your network, and follow up at the right time. Open source and private by design.",
    type: "website",
    siteName: "Dhaga",
    url: SITE_URL,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Dhaga — a private relationship memory for your network",
    description:
      "Remember the context behind every relationship, search your network, and follow up at the right time. Open source and private by design.",
    images: ["/opengraph-image.png"],
  },
};

export const viewport: Viewport = {
  // Themes the mobile browser chrome. Both values are --brand-ink in
  // globals.css: warm paper in :root (light), brand near-black in .dark (which
  // also matches manifest.ts). A single value would leave the chrome dark in
  // light mode.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f5ef" },
    { media: "(prefers-color-scheme: dark)", color: "#101112" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      // suppressHydrationWarning: next-themes sets class/style="color-scheme"
      // on <html> from a pre-hydration script, which never matches the
      // server-rendered markup by design (see next-themes docs).
      suppressHydrationWarning
      className={`${plexMono.variable} ${geistPixel.variable} ${themeFontVariables} h-full antialiased`}
    >
      {/* suppressHydrationWarning: browser extensions (Grammarly et al.)
          inject attributes into <body> before React hydrates; the warning is
          noise. Suppression is attribute-level and this element only. */}
      <body
        suppressHydrationWarning
        className="min-h-full flex flex-col bg-ink text-paper"
      >
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <NuqsAdapter>{children}</NuqsAdapter>
          <Toaster position="bottom-right" />
        </ThemeProvider>
        <SiteStructuredData />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
