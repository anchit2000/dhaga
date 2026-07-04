import { GITHUB_URL, OSS_PILLARS } from "@/utils/constants/landing";
import { DecryptedText } from "./DecryptedText";

export function OpenSource() {
  return (
    <section className="border-y border-seam bg-panel-2/40" id="opensource">
      <div className="mx-auto grid max-w-6xl items-center gap-14 px-6 py-24 lg:grid-cols-2">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-amber">Open source</p>
          <h2 className="mt-4 max-w-none text-balance font-display text-4xl font-medium sm:text-5xl">
            <DecryptedText text="Trust you can read, line by line." />
          </h2>
          <ul className="mt-8 space-y-4">
            {OSS_PILLARS.map((pillar) => (
              <li key={pillar.bold} className="flex gap-3 text-sm">
                <span className="mt-0.5 text-amber">✳</span>
                <p className="text-fog">
                  <span className="font-semibold text-paper">{pillar.bold}</span>
                  {pillar.rest}
                </p>
              </li>
            ))}
          </ul>
        </div>
        <div className="overflow-x-auto rounded-lg border border-seam bg-ink p-6 font-mono text-sm leading-loose transition-all duration-300 hover:border-amber/40 hover:shadow-[0_20px_60px_-24px_rgba(226,164,76,0.3)]">
          <p className="text-fog/60"># run the whole stack yourself</p>
          <p className="text-paper">git clone {GITHUB_URL.replace("https://", "")}</p>
          <p className="text-paper">npm install && npm run dev</p>
          <p className="text-[#7fb98a]">✓ embedded Postgres + pgvector ready</p>
          <p className="text-[#7fb98a]">✓ app running on :3000</p>
          <p className="text-[#7fb98a]">✓ your network. your hardware. your rules.</p>
        </div>
      </div>
    </section>
  );
}
