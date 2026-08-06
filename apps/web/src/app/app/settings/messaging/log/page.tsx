import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CaptureLogList } from "@/components/app/settings/CaptureLog";
import { Button } from "@/components/ui/button";
import { requireUserIdForPage } from "@/lib/auth/guard";
import { toCursorDto, toEntryDto } from "@/lib/capture-log";
import { listCaptureLog } from "@/lib/repo/messaging";
import { CAPTURE_LOG_PAGE_SIZE, MESSAGING_SETTINGS_PATH } from "@/utils/constants/capture-log";

export const metadata = { title: "Capture log — Dhaga" };

/**
 * Every batch ever forwarded to the Dhaga bot, newest first — reached from
 * Settings → Messaging, deliberately NOT from the main nav: it is an audit
 * trail you go looking for when something looks wrong, not a daily surface.
 *
 * The first page is rendered here so the log paints with data rather than with
 * a spinner; "Load more" continues from the same keyset via a server action
 * (lib/actions/capture-log). ONE read, on the request-scoped tenant connection
 * — the read is RLS-scoped by that scope, the same as every other page under
 * /app, and no getDb() is fanned out (the tenant pool caps at 3).
 */
export default async function CaptureLogPage() {
  await requireUserIdForPage();
  const page = await listCaptureLog({ limit: CAPTURE_LOG_PAGE_SIZE });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-2xl tracking-tight">Capture log</h1>
          <p className="mt-1 text-sm text-fog">
            Every batch you forwarded to your Dhaga bot, and what happened to each message
            in it. Expand a batch to see the messages and where they went.
          </p>
        </div>
        <Button render={<Link href={MESSAGING_SETTINGS_PATH} />} variant="outline" size="sm">
          <ArrowLeft />
          Back to Messaging
        </Button>
      </div>
      <CaptureLogList
        initialEntries={page.entries.map(toEntryDto)}
        initialCursor={toCursorDto(page.nextCursor)}
      />
    </div>
  );
}
