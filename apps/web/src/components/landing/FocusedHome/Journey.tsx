import type { ReactElement } from "react";

import { AudioLines, Search, Send } from "lucide-react";

export function Journey(): ReactElement {
  return (
    <section className="border-b border-seam bg-panel/35">
      <div className="mx-auto grid max-w-[1440px] grid-cols-1 px-6 py-10 sm:grid-cols-3 sm:divide-x sm:divide-seam">
        <JourneyStep accent="border-trust/30 bg-trust/10 text-trust" icon={<AudioLines />} number="1" title="Capture anywhere" copy="Send a note, card, or photo from the web, WhatsApp, Telegram, or MCP. Native mobile apps are coming soon." />
        <JourneyStep accent="border-magic/30 bg-magic/10 text-magic" icon={<Search />} number="2" title="Remember" copy="Search the context later in plain language, with its source attached." />
        <JourneyStep accent="border-calm/30 bg-calm/10 text-calm" icon={<Send />} number="3" title="Follow up" copy="Get a useful prompt or draft while the relationship is still warm." />
      </div>
    </section>
  );
}

function JourneyStep({ icon, number, title, copy, accent }: { icon: ReactElement; number: string; title: string; copy: string; accent: string }): ReactElement {
  return (
    <div className="flex gap-4 py-5 sm:px-6 sm:first:pl-0 sm:last:pr-0">
      <span className={`flex size-12 shrink-0 items-center justify-center rounded-xl border [&_svg]:size-5 ${accent}`}>{icon}</span>
      <div><p className="font-display text-xl">{number}. {title}</p><p className="mt-1 text-sm leading-6 text-fog">{copy}</p></div>
    </div>
  );
}
