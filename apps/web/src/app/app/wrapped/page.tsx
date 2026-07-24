import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { requireUserIdForPage } from "@/lib/auth/guard";
import { getNetworkWrapped, listWrappedScopeOptions } from "@/lib/repo/wrapped";
import { buildWrappedShareUrl } from "@/lib/wrapped/sign";
import { WRAPPED_DEFAULT_SCOPE_KIND } from "@/lib/wrapped/scope";
import { WrappedStudio } from "@/components/app/wrapped";
import type { ReactElement } from "react";
import type { WrappedScope } from "@dhaga/core/src/api/wrapped";

export const metadata = { title: "Network Wrapped — Dhaga" };

/**
 * Owner-only Wrapped studio. The shell auth-gates and paints instantly; the
 * card data streams in its own Suspense boundary. Every figure is deterministic
 * SQL (no LLM), and the share artifact is contact-free by construction.
 */
export default async function WrappedPage(): Promise<ReactElement> {
  await requireUserIdForPage();

  return (
    <div className="space-y-8 pb-16">
      <header>
        <p className="font-mono text-[10px] uppercase tracking-widest text-ember">Network Wrapped</p>
        <h1 className="mt-1 font-display text-2xl tracking-tight">Your networking, in review</h1>
        <p className="mt-1.5 text-sm text-fog">
          A shareable, contact-free recap of who you met and how your circle grew.
        </p>
      </header>

      <Suspense fallback={<WrappedFallback />}>
        <WrappedData />
      </Suspense>
    </div>
  );
}

async function WrappedData(): Promise<ReactElement> {
  const scope: WrappedScope = { kind: WRAPPED_DEFAULT_SCOPE_KIND };
  // Sequential (not Promise.all) — both share the one pinned tenant connection.
  const stats = await getNetworkWrapped(scope);
  const options = await listWrappedScopeOptions();
  const shareUrl = buildWrappedShareUrl(stats);
  return (
    <WrappedStudio
      initialScope={scope}
      initialStats={stats}
      initialShareUrl={shareUrl}
      options={options}
    />
  );
}

function WrappedFallback(): ReactElement {
  return (
    <div className="space-y-6">
      <Skeleton className="h-11 w-full max-w-md" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <Skeleton className="aspect-[1200/630] w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    </div>
  );
}
