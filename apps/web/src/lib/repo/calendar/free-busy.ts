import { mergeBusy, type BusyInterval, type TimeRange } from "@dhaga/core";
import { connectedCalendarRows, markNeedsReconnect, providerFor, usableAccessToken } from "./access";

/**
 * Merged busy intervals across every connected calendar for `range`. Refreshes
 * near-expiry access tokens in place; a provider that errors (revoked access,
 * unknown provider id) is flagged `needs_reconnect` and skipped rather than
 * failing the whole read — one broken calendar never blocks the others.
 *
 * This is the FREE/BUSY tier and stays exactly that: `listBusy` is the only
 * method it calls, whatever a connection's granted scope happens to permit.
 * Sequential by design — one scoped connection, no getDb() fan-out.
 */
export async function getFreeBusy(range: TimeRange): Promise<BusyInterval[]> {
  const rows = await connectedCalendarRows();
  const all: BusyInterval[] = [];
  for (const row of rows) {
    try {
      const provider = providerFor(row);
      if (!provider) {
        await markNeedsReconnect(row.id);
        continue;
      }
      const accessToken = await usableAccessToken(provider, row);
      if (!accessToken) continue;
      all.push(...(await provider.listBusy({ accessToken, range })));
    } catch {
      await markNeedsReconnect(row.id);
    }
  }
  return mergeBusy(all);
}
