"use client";

import { useCallback, useMemo, useState } from "react";
import { ScopeSelector } from "./ScopeSelector";
import { WrappedCardPreview } from "./WrappedCardPreview";
import { ShareModal } from "./ShareModal";
import { RevealToggle } from "./RevealToggle";
import { buildWrappedOgUrl, shareUrlSig, statsToCardParams } from "@/lib/wrapped/og-url";
import { WRAPPED_CARD_SIZES } from "@/utils/constants/wrapped";
import type { ReactElement } from "react";
import type {
  WrappedApiResponse,
  WrappedCardFormat,
  WrappedScope,
  WrappedScopeOption,
  WrappedStats,
} from "@dhaga/core/src/api/wrapped";

const FORMATS = Object.keys(WRAPPED_CARD_SIZES) as WrappedCardFormat[];

/**
 * The owner's Wrapped studio. Holds the active scope, live stats, and share
 * URL; switching scope refetches /api/wrapped. Per-format image URLs are built
 * client-side from the (contact-free) stats plus the HMAC parsed out of the
 * share URL — the signing secret never reaches the browser.
 */
export function WrappedStudio({
  initialScope,
  initialStats,
  initialShareUrl,
  options,
}: {
  initialScope: WrappedScope;
  initialStats: WrappedStats;
  initialShareUrl: string;
  options: WrappedScopeOption[];
}): ReactElement {
  const [scope, setScope] = useState(initialScope);
  const [stats, setStats] = useState(initialStats);
  const [shareUrl, setShareUrl] = useState(initialShareUrl);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);

  const ogUrls = useMemo(() => {
    const params = statsToCardParams(stats);
    const sig = shareUrlSig(shareUrl);
    return Object.fromEntries(
      FORMATS.map((format) => [format, buildWrappedOgUrl(params, sig, format, { absolute: false })]),
    ) as Record<WrappedCardFormat, string>;
  }, [stats, shareUrl]);

  const changeScope = useCallback(async (next: WrappedScope): Promise<void> => {
    setScope(next);
    setLoading(true);
    setError(null);
    setRevealed(false);
    try {
      const query = new URLSearchParams({ kind: next.kind });
      if (next.eventId) query.set("eventId", next.eventId);
      if (next.anchor) query.set("anchor", next.anchor);
      const response = await fetch(`/api/wrapped?${query.toString()}`);
      if (!response.ok) throw new Error("request failed");
      const data = (await response.json()) as WrappedApiResponse;
      setStats(data.stats);
      setShareUrl(data.shareUrl);
    } catch {
      setError("Couldn't load that view. Try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  const hasReveal = Boolean(
    stats.reveal && (stats.reveal.topCompanyName || stats.reveal.mostConnectedName),
  );

  return (
    <div className="space-y-6">
      <ScopeSelector options={options} value={scope} onChange={changeScope} disabled={loading} />
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start">
        <WrappedCardPreview stats={stats} ogUrl={ogUrls.landscape} loading={loading} />
        <div className="flex flex-col gap-4">
          <ShareModal shareUrl={shareUrl} ogUrls={ogUrls} title={`${stats.scopeLabel} — Network Wrapped`} />
          <RevealToggle
            stats={stats}
            revealed={revealed}
            onChange={setRevealed}
            disabled={!hasReveal}
          />
        </div>
      </div>
    </div>
  );
}
