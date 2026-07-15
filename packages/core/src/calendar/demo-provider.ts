import type { BusyInterval, CalendarProvider, CalendarTokens, TimeRange } from "./types";

const DAY_MS = 86_400_000;

/**
 * A synthetic calendar with no external dependency. It lets the whole feature —
 * connect flow, free/busy read, slot-finding, overload banner, digest, and the
 * Playwright suite — run end to end before any real Google/Microsoft OAuth app
 * exists ("use dummy for now"). Enabled by default; set DHAGA_CALENDAR_DEMO=false
 * to hide it once real providers are configured.
 *
 * Its OAuth is a loopback: getAuthUrl points straight back at our callback with
 * a demo code, so "Connect" completes without leaving the app. Busy blocks are
 * DETERMINISTIC functions of the date (no Math.random) so tests are stable and
 * some days read as overloaded while others stay open.
 */
export class DemoCalendarProvider implements CalendarProvider {
  readonly id = "demo";
  readonly label = "Demo Calendar";

  isConfigured(): boolean {
    return process.env.DHAGA_CALENDAR_DEMO !== "false";
  }

  getAuthUrl(params: { state: string; redirectUri: string }): string {
    const url = new URL(params.redirectUri);
    url.searchParams.set("code", "demo-code");
    url.searchParams.set("state", params.state);
    return url.toString();
  }

  async exchangeCode(): Promise<CalendarTokens> {
    return {
      accessToken: "demo-access-token",
      refreshToken: "demo-refresh-token",
      expiresAt: new Date(Date.now() + 3_600_000),
      scope: "demo.freebusy",
      accountEmail: "demo@calendar.local",
    };
  }

  async refresh(): Promise<CalendarTokens | null> {
    return {
      accessToken: "demo-access-token",
      refreshToken: "demo-refresh-token",
      expiresAt: new Date(Date.now() + 3_600_000),
      scope: "demo.freebusy",
      accountEmail: "demo@calendar.local",
    };
  }

  async listBusy({ range }: { accessToken: string; range: TimeRange }): Promise<BusyInterval[]> {
    const busy: BusyInterval[] = [];
    const first = Date.UTC(
      range.from.getUTCFullYear(),
      range.from.getUTCMonth(),
      range.from.getUTCDate(),
    );
    for (let dayStart = first; dayStart <= range.to.getTime(); dayStart += DAY_MS) {
      const day = new Date(dayStart);
      const dow = day.getUTCDay();
      if (dow === 0 || dow === 6) continue; // weekends stay clear
      const blocks = this.blocksForDay(day.getUTCDate());
      for (const [startH, startM, endH, endM] of blocks) {
        const start = new Date(dayStart + (startH * 60 + startM) * 60_000);
        const end = new Date(dayStart + (endH * 60 + endM) * 60_000);
        if (end > range.from && start < range.to) busy.push({ start, end });
      }
    }
    return busy;
  }

  /** Every third day-of-month is "overloaded"; others get a single afternoon block. */
  private blocksForDay(dayOfMonth: number): Array<[number, number, number, number]> {
    const standup: [number, number, number, number] = [9, 30, 10, 0];
    if (dayOfMonth % 3 === 0) {
      return [standup, [11, 0, 12, 0], [13, 0, 13, 30], [15, 0, 16, 0]];
    }
    return [standup, [14, 0, 14, 30]];
  }
}
