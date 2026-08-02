/** Landing-page top-nav data, shared by the desktop header and the mobile menu. */

import { BookOpen, Compass, Newspaper } from "lucide-react";

/** Public marketing links shown in both the desktop header and mobile menu. */
export const NAV_LINKS = [
  { href: "/features", label: "Features" },
  { href: "/#use-cases", label: "Use cases" },
  { href: "/open-source", label: "Open source" },
  { href: "/pricing", label: "Pricing" },
] as const;

/**
 * Cards inside the "Resources" menu — the desktop hover panel (ResourcesMenu)
 * and the mobile menu both render these. Carry Lucide icon components, so this
 * mirrors the icon-bearing nav constants in `constants/app.ts`.
 */
export const RESOURCE_ITEMS = [
  {
    href: "/blog",
    title: "Blog",
    description: "Engineering deep-dives & practical guides",
    icon: Newspaper,
  },
  {
    href: "/docs",
    title: "Docs",
    description: "Product guide, self-hosting & API reference",
    icon: BookOpen,
  },
  {
    href: "/blog/general/why-i-built-dhaga",
    title: "Why I built this",
    description: "The founder story",
    icon: Compass,
  },
] as const;
