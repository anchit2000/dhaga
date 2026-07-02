import { GITHUB_URL, OSS_PILLARS } from "@/utils/constants/landing";

export function OpenSource() {
  return (
    <section className="border-y border-seam bg-panel-2/40" id="opensource">
      <div className="mx-auto grid max-w-6xl items-center gap-14 px-6 py-24 lg:grid-cols-2">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-amber">
            Open source
          </p>
          <h2 className="mt-4 text-balance font-display text-4xl font-medium sm:text-5xl">
            Trust you can read, line by line.
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
        <div className="overflow-x-auto rounded-lg border border-seam bg-ink p-6 font-mono text-sm leading-loose">
          <p className="text-fog/60"># run the whole stack yourself</p>
          <p className="text-paper">git clone {GITHUB_URL.replace("https://", "")}</p>
          <p className="text-paper">docker compose up</p>
          <p className="text-[#7fb98a]">✓ postgres + pgvector ready</p>
          <p className="text-[#7fb98a]">✓ sync server listening on :8080</p>
          <p className="text-[#7fb98a]">✓ your network. your hardware. your rules.</p>
        </div>
      </div>
    </section>
  );
}
