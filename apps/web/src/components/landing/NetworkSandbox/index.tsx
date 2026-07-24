import { SANDBOX_EYEBROW, SANDBOX_HEADING, SANDBOX_INTRO } from "@/utils/constants/landing";
import { SectionHeading } from "../SectionHeading";
import { SandboxLauncher } from "./SandboxLauncher";

/**
 * "Try it" section: a static teaser + CTA that lazily mounts the real sigma
 * graph widget only after the visitor clicks (SandboxLauncher). Server
 * component — the launcher and graph are the sole client boundaries, so the
 * landing stays featherweight until interaction.
 */
export function NetworkSandbox(): React.ReactElement {
  return (
    <section className="border-y border-seam">
      <div className="mx-auto max-w-6xl px-6 py-24">
        <SectionHeading eyebrow={SANDBOX_EYEBROW} heading={SANDBOX_HEADING} intro={SANDBOX_INTRO} />
        <div className="mt-10">
          <SandboxLauncher />
        </div>
      </div>
    </section>
  );
}
