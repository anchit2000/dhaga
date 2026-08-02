import type { ReactElement } from "react";

import { Brain, Network, TimerReset } from "lucide-react";

export function Outcomes(): ReactElement {
  return (
    <section id="outcomes" className="mx-auto max-w-[1440px] px-6 py-20 sm:py-24">
      <div className="grid gap-10 lg:grid-cols-[0.7fr_1.3fr]">
        <div><p className="font-mono text-xs uppercase tracking-[0.22em] text-ember">Less admin. More context.</p><h2 className="mt-4 text-balance font-display text-4xl leading-tight sm:text-5xl">Your network, without the spreadsheet upkeep.</h2></div>
        <div className="grid gap-px overflow-hidden rounded-2xl border border-seam bg-seam sm:grid-cols-3">
          <Outcome icon={<Brain />} title="Recall the detail" copy="Keep the why, where, and what-next—not just a name and email." />
          <Outcome icon={<Network />} title="Find the right person" copy="Ask who knows a market, company, skill, or potential introduction." />
          <Outcome icon={<TimerReset />} title="Act at the right time" copy="See follow-ups, changes, and relationships that are going quiet." />
        </div>
      </div>
    </section>
  );
}

function Outcome({ icon, title, copy }: { icon: ReactElement; title: string; copy: string }): ReactElement {
  return <article className="bg-panel p-6"><span className="text-ember [&_svg]:size-5">{icon}</span><h3 className="mt-8 font-display text-xl">{title}</h3><p className="mt-2 text-sm leading-6 text-fog">{copy}</p></article>;
}
