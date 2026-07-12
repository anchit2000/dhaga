import * as Location from "expo-location";

import { encodeGeohash, GEOHASH_CLUSTER_PRECISION } from "@dhaga/core/src/geo/geohash";

export interface ScanLocation {
  geohash: string;
  scannedAt: string;
}

/**
 * Coarse geohash-6 + capture time for a scan (M2 auto event grouping, BRD
 * §6.2). Permission is requested here — at the moment of the first scan,
 * not on app launch. Denial, or any location failure, resolves to null so
 * capture never blocks on it: the scan just isn't auto-grouped into a
 * event, same tone as camera-capture-view's permission handling.
 */
export async function getScanLocation(): Promise<ScanLocation | null> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") return null;
    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    const geohash = encodeGeohash(
      position.coords.latitude,
      position.coords.longitude,
      GEOHASH_CLUSTER_PRECISION,
    );
    return { geohash, scannedAt: new Date().toISOString() };
  } catch {
    return null;
  }
}
