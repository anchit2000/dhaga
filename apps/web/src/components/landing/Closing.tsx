import { GITHUB_URL } from "@/utils/constants/landing";
import { RequestAccessForm } from "./RequestAccessForm";
import { SectionHeading } from "./SectionHeading";

export function FinalCta() {
  return (
    <section className="border-t border-seam bg-panel-2/40" id="request-access">
      <div className="mx-auto max-w-6xl px-6 py-24">
        <SectionHeading
          eyebrow="Early access"
          heading="Own the relationship context that moves with you."
          headingClassName="max-w-2xl"
          intro={
            <>
              Request access to Dhaga Cloud. The first 500 approved Pro seats
              can request a $79 first year; standard annual Pro is $96. Power
              stays on the waitlist until its billing and entitlements are live.
            </>
          }
        />
        <RequestAccessForm />
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-seam">
      <div className="mx-auto flex max-w-6xl flex-wrap items-start justify-between gap-10 px-6 py-14">
        <div className="max-w-xs">
          <p className="font-display text-xl">
            dhaga<span className="text-ember">.</span>
          </p>
          <p className="mt-3 text-sm text-fog">
            धागा — thread. The one that ties your network together.
          </p>
        </div>
        <div className="flex gap-16 text-sm">
          <div className="space-y-2.5">
            <p className="font-mono text-[10px] uppercase tracking-widest text-fog">
              Product
            </p>
            <FooterLink href="/features" label="Features" />
            <FooterLink href="/#use-cases" label="Use cases" />
            <FooterLink href="/pricing" label="Pricing" />
            <FooterLink href="/#faq" label="FAQ" />
            <FooterLink href="/blog" label="Blog" />
            <FooterLink href="/docs" label="Docs" />
          </div>
          <div className="space-y-2.5">
            <p className="font-mono text-[10px] uppercase tracking-widest text-fog">
              Open source
            </p>
            <FooterLink href="/open-source" label="Overview" />
            <FooterLink href={GITHUB_URL} label="GitHub" external />
            <FooterLink href={`${GITHUB_URL}/blob/main/LICENSE`} label="AGPL-3.0" external />
            <FooterLink href={`${GITHUB_URL}/blob/main/docs/BRD.md`} label="Roadmap" external />
          </div>
        </div>
      </div>
      <div className="border-t border-seam/60">
        <p className="mx-auto max-w-6xl px-6 py-5 text-xs text-fog">
          © 2026 Dhaga. Built in the open. Your data is yours — always exportable, always deletable.
        </p>
      </div>
    </footer>
  );
}

function FooterLink({
  href,
  label,
  external,
}: {
  href: string;
  label: string;
  external?: boolean;
}) {
  return (
    <a
      href={href}
      className="block text-fog transition-colors hover:text-paper"
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    >
      {label}
    </a>
  );
}
