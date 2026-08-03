import Link from "next/link";
import type { ReactElement } from "react";

import { ArrowRight, Blocks, Globe2, MessageCircle, Send, Smartphone } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CopyCommand } from "@/components/ui/copy-command";
import { MCP_DOCS_PATH, SKILLS_INSTALL_COMMAND } from "@/utils/constants/skills";
import { ProductWindow } from "./ProductWindow";

export function Hero(): ReactElement {
  return (
    <section id="product" className="border-b border-seam pt-24">
      <div className="mx-auto grid max-w-[1440px] items-center gap-12 px-6 pb-14 lg:grid-cols-[0.9fr_1.1fr] lg:gap-14 lg:pb-16">
        <div className="max-w-2xl">
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-trust">
            The personal CRM you own
          </p>
          <h1 className="mt-5 text-balance font-display text-5xl leading-[0.98] tracking-tight sm:text-6xl">
            Your CRM belongs to the company. Your relationships don&apos;t.
          </h1>
          <p className="mt-4 max-w-xl text-pretty text-base leading-7 text-fog sm:text-lg">
            Dhaga is the private, portable relationship memory for people whose network outlasts a
            role. Send cards, handwritten notes, and photos from the web, WhatsApp, or Telegram;
            Dhaga keeps them with the right person.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-4">
            <Button render={<Link href="#request-access" />} size="lg">
              Request early access
              <ArrowRight aria-hidden="true" />
            </Button>
            <Button render={<Link href="/features" />} variant="outline" size="lg">
              See how it works
            </Button>
          </div>
          <div className="mt-4">
            <ul className="flex flex-wrap gap-2" aria-label="Capture channels">
              <CaptureChannel
                icon={<MessageCircle />}
                label="WhatsApp"
                accent="text-calm"
                href="/docs/guide/messaging-capture"
              />
              <CaptureChannel
                icon={<Send />}
                label="Telegram"
                accent="text-trust"
                href="/docs/guide/messaging-capture"
              />
              <CaptureChannel icon={<Globe2 />} label="Web app" accent="text-ember" />
              <CaptureChannel
                icon={<Blocks />}
                label="MCP"
                accent="text-magic"
                href="/docs/guide/mcp"
              />
              <CaptureChannel
                icon={<Smartphone />}
                label="Mobile app"
                accent="text-calm"
                status="Coming soon"
              />
            </ul>
          </div>
          <div className="mt-5 max-w-xl">
            <p className="text-pretty text-sm leading-6 text-fog">
              Already using Claude, Cursor, or ChatGPT? Install the skills, connect your account
              over MCP, and it works with your network.
            </p>
            <CopyCommand
              command={SKILLS_INSTALL_COMMAND}
              label="install command"
              className="mt-3"
            />
            <Link
              href={MCP_DOCS_PATH}
              className="mt-1 inline-flex min-h-11 items-center font-mono text-xs uppercase tracking-[0.12em] text-ember transition-colors hover:text-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-trust/40"
            >
              How it works
            </Link>
          </div>
        </div>
        <ProductWindow />
      </div>
    </section>
  );
}

function CaptureChannel({
  icon,
  label,
  accent,
  href,
  status,
}: {
  icon: ReactElement;
  label: string;
  accent: string;
  href?: string;
  status?: string;
}): ReactElement {
  const content = (
    <>
      <span className={`[&_svg]:size-3.5 ${accent}`} aria-hidden="true">
        {icon}
      </span>
      <span>{label}</span>
      {status ? (
        <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-fog">
          {status}
        </span>
      ) : null}
    </>
  );
  return (
    <li className="flex min-h-11 items-center rounded-full border border-seam bg-panel text-xs text-paper">
      {href ? (
        <Link
          href={href}
          className="flex min-h-11 items-center gap-2 rounded-full px-3 transition-colors hover:bg-panel-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-trust/40"
        >
          {content}
        </Link>
      ) : (
        <span className="flex min-h-11 items-center gap-2 px-3">{content}</span>
      )}
    </li>
  );
}
