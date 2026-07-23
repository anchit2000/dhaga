import { GITHUB_URL } from "@/utils/constants/landing";
import { RequestAccessForm } from "./RequestAccessForm";
import { SectionHeading } from "./SectionHeading";

export function FinalCta() {
  return (
    <section className="border-t border-seam bg-panel-2/40" id="request-access">
      <div className="mx-auto max-w-6xl px-6 py-24">
        <SectionHeading
          eyebrow="Early access"
          heading="Remember everyone worth remembering."
          headingClassName="max-w-2xl"
          intro={
            <>
              The next conference is coming — arrive with a memory. Request
              access to the beta: the first 500 approved signups lock the $79
              founding annual price — after that it&apos;s $99/yr, and
              that&apos;s a promise we keep in public.
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
            dhaga<span className="text-amber">.</span>
          </p>
          <p className="mt-3 text-sm text-fog">
            धागा — thread. The one that ties your network together.
          </p>
        </div>
        <div className="flex gap-16 text-sm">
          <div className="space-y-2.5">
            <p className="font-mono text-[10px] uppercase tracking-widest text-fog/60">
              Product
            </p>
            <FooterLink href="#product" label="Product" />
            <FooterLink href="#pricing" label="Pricing" />
            <FooterLink href="#faq" label="FAQ" />
            <FooterLink href="/blog" label="Blog" />
            <FooterLink href="/docs" label="Docs" />
          </div>
          <div className="space-y-2.5">
            <p className="font-mono text-[10px] uppercase tracking-widest text-fog/60">
              Open source
            </p>
            <FooterLink href={GITHUB_URL} label="GitHub" external />
            <FooterLink href={`${GITHUB_URL}/blob/main/LICENSE`} label="AGPL-3.0" external />
            <FooterLink href={`${GITHUB_URL}/blob/main/docs/BRD.md`} label="Roadmap" external />
          </div>
        </div>
      </div>
      <div className="border-t border-seam/60">
        <p className="mx-auto max-w-6xl px-6 py-5 text-xs text-fog/60">
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
