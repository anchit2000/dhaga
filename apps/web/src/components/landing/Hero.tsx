import Link from "next/link";
import { Button } from "@/components/ui/button";
import { GITHUB_URL, HERO } from "@/utils/constants/landing";
import { ThreadCanvas } from "./ThreadCanvas";
import { AppWindow } from "./AppWindow";
import { PhoneShell } from "./devices/PhoneShell";
import { ScanScreen } from "./devices/ScanScreen";

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-36 pb-8" id="product">
      <ThreadCanvas />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_20%,transparent_0%,#0d0b09_90%)]" />
      <div className="relative mx-auto max-w-6xl px-6 text-center">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-amber">
          {HERO.eyebrow}
        </p>
        <h1 className="mx-auto mt-6 max-w-4xl text-balance font-display text-5xl leading-[1.04] font-medium sm:text-7xl">
          Every <em className="text-amber italic">thread</em>, remembered.
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg text-fog">
          {HERO.sub}
        </p>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
          <Button render={<Link href="#waitlist" />} size="lg">
            {HERO.primaryCta}
          </Button>
          <Button
            render={
              <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" />
            }
            size="lg"
            variant="outline"
          >
            {HERO.secondaryCta}
          </Button>
        </div>
        <p className="mt-4 text-sm text-fog">
          Free to start · Your data stays on your phone · AGPL-3.0
        </p>
        <div className="relative mt-16 pb-12">
          <div className="pointer-events-none absolute -inset-x-20 -top-24 h-64 bg-[radial-gradient(ellipse_50%_100%_at_50%_100%,rgba(226,164,76,0.13),transparent_70%)]" />
          <AppWindow />
          {/* mobile capture, front-left: phone scans while the desktop thinks */}
          <div className="absolute -bottom-4 left-0 z-10 hidden w-44 -rotate-3 md:block lg:-left-6">
            <PhoneShell>
              <ScanScreen />
            </PhoneShell>
          </div>
        </div>
      </div>
    </section>
  );
}
