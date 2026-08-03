import { mergeBusy, type BusyInterval, type TimeRange } from "@dhaga/core";
import {
  applyCalendarWrites,
  connectedCalendarRows,
  providerFor,
  usableAccessToken,
  type CalendarWrite,
} from "./access";

/** Runs one DB phase inside a tenant scope of the caller's choosing. */
export type FreeBusyScope = <T>(work: () => Promise<T>) => Promise<T>;

/** Default: run the DB phases on whatever scope is already ambient. */
const inline: FreeBusyScope = (work) => work();

/**
 * Merged busy intervals across every connected calendar for `range`. Refreshes
 * near-expiry access tokens; a provider that errors (revoked access, unknown
 * provider id) is flagged `needs_reconnect` and skipped rather than failing the
 * whole read — one broken calendar never blocks the others.
 *
 * This is the FREE/BUSY tier and stays exactly that: `listBusy` is the only
 * method it calls, whatever a connection's granted scope happens to permit.
 *
 * THREE PHASES, and the split is the point (docs/SCALING.md lever 2, and the
 * pool-exhaustion history in lib/db/request-scope.ts): read the connection rows,
 * then talk to the providers holding NO connection, then flush the row writes
 * those round-trips produced. Interleaved — as this used to be — every outbound
 * Google/Microsoft call sat inside an open tenant transaction, so one slow or
 * hanging third party held one of the three tenant-pool slots for its full
 * duration. Pass `runScoped` to give each DB phase its own short scope; the
 * default runs them on the ambient one, for callers that already hold it.
 *
 * Sequential over connections by design — fanning getDb() out per calendar is
 * the other half of the same trap.
 */
export async function getFreeBusy(
  range: TimeRange,
  runScoped: FreeBusyScope = inline,
): Promise<BusyInterval[]> {
  const rows = await runScoped(() => connectedCalendarRows());

  const pending: CalendarWrite[] = [];
  const all: BusyInterval[] = [];
  for (const row of rows) {
    try {
      const provider = providerFor(row);
      if (!provider) {
        pending.push({ kind: "needs_reconnect", id: row.id });
        continue;
      }
      const accessToken = await usableAccessToken(provider, row, pending);
      if (!accessToken) continue;
      all.push(...(await provider.listBusy({ accessToken, range })));
    } catch {
      pending.push({ kind: "needs_reconnect", id: row.id });
    }
  }

  if (pending.length > 0) await runScoped(() => applyCalendarWrites(pending));
  return mergeBusy(all);
}
