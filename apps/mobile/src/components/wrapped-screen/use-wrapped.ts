import { useCallback, useState } from "react";
import { router, useFocusEffect } from "expo-router";

import { CaptureError } from "@/lib/api";
import { getWrapped } from "@/lib/api-growth";
import { isConfigured, loadSettings } from "@/lib/settings";
import { WRAPPED_DEFAULT_SCOPE_KIND } from "@/utils/constants/growth";

import type { MobileSettings, WrappedApiResponse, WrappedScopeKind } from "@/types";

/**
 * State + effects behind the Wrapped screen: connection settings, the picked
 * scope, and the GET /api/wrapped fetch. On focus it loads settings (redirecting
 * to /setup when the app isn't configured) and fetches the default scope once;
 * switching a scope chip refetches. The returned figures are contact-free and
 * are never logged.
 */
export function useWrapped() {
  const [settings, setSettings] = useState<MobileSettings | null>(null);
  const [scopeKind, setScopeKind] = useState<WrappedScopeKind>(WRAPPED_DEFAULT_SCOPE_KIND);
  const [data, setData] = useState<WrappedApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (active: MobileSettings, kind: WrappedScopeKind): Promise<void> => {
      setLoading(true);
      setError(null);
      try {
        // anchor = device "now" so rolling/calendar windows match the user's
        // local sense of the current week/month/year (server clamps to its clock).
        const result = await getWrapped(active, { kind, anchor: new Date().toISOString() });
        setData(result);
      } catch (err) {
        setError(
          err instanceof CaptureError || err instanceof Error
            ? err.message
            : "Something went wrong. Try again.",
        );
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useFocusEffect(
    useCallback(() => {
      void loadSettings().then((loaded) => {
        if (!isConfigured(loaded)) {
          router.replace("/setup");
          return;
        }
        setSettings(loaded);
        if (!data) void load(loaded, scopeKind);
      });
    }, [load, scopeKind, data]),
  );

  const selectScope = useCallback(
    (kind: WrappedScopeKind): void => {
      if (kind === scopeKind || loading) return;
      setScopeKind(kind);
      if (settings) void load(settings, kind);
    },
    [scopeKind, loading, settings, load],
  );

  const retry = useCallback((): void => {
    if (settings) void load(settings, scopeKind);
  }, [settings, scopeKind, load]);

  return { scopeKind, data, loading, error, selectScope, retry };
}
