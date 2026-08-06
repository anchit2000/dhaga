import type { ReactElement } from "react";
import Link from "next/link";
import { Home, LayoutDashboard } from "lucide-react";

import { SearchingShopkeeper } from "@/components/brand/SearchingShopkeeper";
import { Button } from "@/components/ui/button";

export function NotFoundContent(): ReactElement {
  return (
    <section className="mx-auto flex min-h-[calc(100dvh-8rem)] w-full max-w-3xl flex-col items-center justify-center gap-6 py-8 text-center sm:gap-8">
      <div className="space-y-2">
        <p className="font-mono text-xs uppercase tracking-[0.24em] text-ember">404 · Loose thread</p>
        <p className="text-sm text-fog">This page may have moved, or it has not reached the loom yet.</p>
      </div>

      <SearchingShopkeeper />

      <nav className="flex w-full flex-col justify-center gap-3 sm:w-auto sm:flex-row" aria-label="Page recovery">
        <Button render={<Link href="/app" />} size="lg" className="w-full sm:w-auto">
          <LayoutDashboard />
          Open Dhaga
        </Button>
        <Button render={<Link href="/" />} size="lg" variant="outline" className="w-full sm:w-auto">
          <Home />
          Go to homepage
        </Button>
      </nav>
    </section>
  );
}
