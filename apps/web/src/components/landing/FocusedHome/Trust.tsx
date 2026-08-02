import Link from "next/link";
import type { ReactElement } from "react";

import { Code2, Download, LockKeyhole } from "lucide-react";

import { GITHUB_URL } from "@/utils/constants/landing";

export function Trust(): ReactElement {
  return (
    <section id="opensource" className="border-y border-seam bg-panel/45">
      <div className="mx-auto max-w-[1440px] px-6 py-20 sm:py-24">
        <div className="max-w-2xl"><p className="font-mono text-xs uppercase tracking-[0.22em] text-ember">Built around ownership</p><h2 className="mt-4 font-display text-4xl sm:text-5xl">Your relationships stay yours.</h2></div>
        <div className="mt-10 grid overflow-hidden rounded-2xl border border-seam sm:grid-cols-3 sm:divide-x sm:divide-seam">
          <TrustItem icon={<LockKeyhole />} title="Private by default" copy="Your network is encrypted and never used to train shared models." />
          <TrustItem icon={<Code2 />} title="Open-source core" copy="Inspect it, audit it, or self-host it under AGPL-3.0." link={GITHUB_URL} label="View GitHub" />
          <TrustItem icon={<Download />} title="Export anytime" copy="Take your contacts and notes with you. Cloud pricing stays simple." link="/pricing" label="See pricing" />
        </div>
      </div>
    </section>
  );
}

function TrustItem({ icon, title, copy, link, label }: { icon: ReactElement; title: string; copy: string; link?: string; label?: string }): ReactElement {
  const body = <><span className="text-ember [&_svg]:size-5">{icon}</span><h3 className="mt-6 font-display text-xl">{title}</h3><p className="mt-2 text-sm leading-6 text-fog">{copy}</p>{link && label ? <p className="mt-5 text-sm text-ember">{label} →</p> : null}</>;
  return link ? <Link href={link} className="block p-7 transition-colors hover:bg-wash/[0.03]">{body}</Link> : <article className="p-7">{body}</article>;
}
