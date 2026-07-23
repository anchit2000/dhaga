"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { BookOpen, ChevronDown, Compass, Newspaper } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import type { ReactElement } from "react";

interface ResourceItem {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
}

// Cards inside the hover-expand "Resources" panel. Kept inline alongside the
// header nav (mirrors NAV_LINKS in Header.tsx) rather than a shared constant —
// these are header-only and carry JSX icons.
const RESOURCE_ITEMS: readonly ResourceItem[] = [
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
];

// Hover-expand "Resources" top-nav item. Opens on hover, on keyboard focus, and
// on click/tap so it is reachable without a pointer. Escape closes and returns
// focus to the trigger; focus leaving the group closes it (no focus trap).
export function ResourcesMenu(): ReactElement {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const close = useCallback((): void => setOpen(false), []);

  // Close when a tap/click lands outside the group (covers touch, where there
  // is no mouseleave to rely on).
  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent): void {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  function onBlur(event: React.FocusEvent<HTMLDivElement>): void {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setOpen(false);
    }
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>): void {
    if (event.key === "Escape" && open) {
      event.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
    }
  }

  return (
    <div
      ref={containerRef}
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={close}
      onFocus={() => setOpen(true)}
      onBlur={onBlur}
      onKeyDown={onKeyDown}
    >
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-1 rounded-full px-4 py-1.5 text-sm text-fog transition-colors hover:text-paper aria-expanded:text-paper"
      >
        Resources
        <ChevronDown
          className={cn(
            "size-3.5 transition-transform duration-200 motion-reduce:transition-none",
            open && "rotate-180",
          )}
          aria-hidden="true"
        />
      </button>

      <div
        className={cn(
          "absolute right-0 top-full z-50 mt-2 w-80 origin-top-right rounded-2xl border border-seam bg-panel p-2 shadow-2xl shadow-black/40 transition-[opacity,transform] duration-150 ease-out motion-reduce:transition-opacity",
          open
            ? "visible scale-100 opacity-100"
            : "invisible scale-95 opacity-0 motion-reduce:scale-100",
        )}
      >
        {RESOURCE_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={close}
              className="group flex items-start gap-3 rounded-xl p-3 transition-colors hover:bg-amber/5"
            >
              <span className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-seam bg-amber/10 text-amber transition-colors group-hover:border-amber/40">
                <Icon className="size-4" aria-hidden="true" />
              </span>
              <span className="flex flex-col gap-0.5">
                <span className="text-sm font-medium text-paper transition-colors group-hover:text-amber">
                  {item.title}
                </span>
                <span className="text-xs leading-relaxed text-fog">
                  {item.description}
                </span>
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
