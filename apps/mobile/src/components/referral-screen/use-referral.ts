import { useCallback, useState } from "react";
import { router, useFocusEffect } from "expo-router";

import { CaptureError } from "@/lib/api";
import { getReferral } from "@/lib/api-growth";
import { isConfigured, loadSettings } from "@/lib/settings";

import type { MobileSettings, ReferralInfo } from "@/types";

/**
 * State + effects behind the referral (advocate) screen: connection settings
 * and the GET /api/referral fetch. On focus it loads settings (redirecting to
 * /setup when unconfigured) and fetches once. `referral` stays null when the
 * server has referrals off (self-host / billing disabled). Redemption is
 * web-only — there's no redeem flow here.
 */
export function useReferral() {
  const [settings, setSettings] = useState<MobileSettings | null>(null);
  const [referral, setReferral] = useState<ReferralInfo | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (active: MobileSettings): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const result = await getReferral(active);
      setReferral(result.referral);
      setLoaded(true);
    } catch (err) {
      setError(
        err instanceof CaptureError || err instanceof Error
          ? err.message
          : "Something went wrong. Try again.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadSettings().then((loaded_) => {
        if (!isConfigured(loaded_)) {
          router.replace("/setup");
          return;
        }
        setSettings(loaded_);
        if (!loaded) void load(loaded_);
      });
    }, [load, loaded]),
  );

  const retry = useCallback((): void => {
    if (settings) void load(settings);
  }, [settings, load]);

  return { referral, loaded, loading, error, retry };
}
