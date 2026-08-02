import type { ReactElement } from "react";

import { AudioLines, Search, Send } from "lucide-react";

export function Journey(): ReactElement {
  return (
    <section className="border-b border-seam bg-panel/35">
      <div className="mx-auto grid max-w-[1440px] grid-cols-1 px-6 py-10 sm:grid-cols-3 sm:divide-x sm:divide-seam">
        <JourneyStep icon={<AudioLines />} number="1" title="Capture" copy="Save a meeting, note, message, voice memo, introduction, or card." />
        <JourneyStep icon={<Search />} number="2" title="Remember" copy="Search the context later in plain language, with its source attached." />
        <JourneyStep icon={<Send />} number="3" title="Follow up" copy="Get a useful prompt or draft while the relationship is still warm." />
      </div>
    </section>
  );
}

function JourneyStep({ icon, number, title, copy }: { icon: ReactElement; number: string; title: string; copy: string }): ReactElement {
  return (
    <div className="flex gap-4 py-5 sm:px-6 sm:first:pl-0 sm:last:pr-0">
      <span className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-line bg-ink text-ember [&_svg]:size-5">{icon}</span>
      <div><p className="font-display text-xl">{number}. {title}</p><p className="mt-1 text-sm leading-6 text-fog">{copy}</p></div>
    </div>
  );
}
