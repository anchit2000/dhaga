import { requireUserIdFromRequest } from "@/lib/auth/guard";
import { exportContacts, exportEverything } from "@/lib/export/data";
import { contactsToCsv, contactsToVCards } from "@/lib/export/formats";
import { CONTACT_SYNC_PROVIDERS } from "@/utils/constants/sync";
import type { ContactSyncProviderId } from "@dhaga/core/src/api/sync";
import type { ExportFormat, ExportScope } from "@dhaga/core/src/api/export";
import type { ExportContactsOptions } from "@/lib/export/data";

function isExportFormat(value: string): value is ExportFormat {
  return value === "csv" || value === "vcard" || value === "json";
}

function isExportScope(value: string): value is ExportScope {
  return value === "all" || value === "authored";
}

function isSyncProvider(value: string): value is ContactSyncProviderId {
  return (CONTACT_SYNC_PROVIDERS as readonly string[]).includes(value);
}

/**
 * Read the contact-export filters off the query string, or say why they are
 * unusable.
 *
 * Every rejection here is a 400 rather than a silently ignored parameter. A
 * misspelt `scope` that fell back to "everything" would hand the user a file
 * they believe is safe to import into their phone and which in fact contains
 * AI-inferred stubs and every list they have ever imported — the one outcome
 * the seed scope exists to prevent.
 */
function parseExportOptions(
  url: URL,
  format: ExportFormat,
): { options: ExportContactsOptions } | { error: string } {
  const scope = url.searchParams.get("scope");
  const provider = url.searchParams.get("provider");
  if (scope === null && provider === null) return { options: {} };
  if (format === "json") {
    return { error: "scope and provider apply to the csv and vcard exports only." };
  }
  if (scope !== null && !isExportScope(scope)) {
    return { error: "Unknown scope. Use all or authored." };
  }
  if (provider !== null && !isSyncProvider(provider)) {
    return { error: `Unknown provider. Use ${CONTACT_SYNC_PROVIDERS.join(", ")}.` };
  }
  // `provider` narrows an export to what is not yet on that address book, which
  // only means anything for a seed. Honouring it on the full export would quietly
  // turn the leave-with-all-your-data download into a partial one.
  if (provider !== null && scope !== "authored") {
    return { error: "provider requires scope=authored." };
  }
  return { options: { scope: scope ?? undefined, provider } };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ format: string }> },
): Promise<Response> {
  try {
    await requireUserIdFromRequest(request);
  } catch {
    return new Response("Unauthorized", { status: 401 });
  }
  const { format } = await params;
  if (!isExportFormat(format)) {
    return new Response("Unknown format. Use csv, vcard, or json.", { status: 404 });
  }
  const parsed = parseExportOptions(new URL(request.url), format);
  if ("error" in parsed) return new Response(parsed.error, { status: 400 });
  const stamp = new Date().toISOString().slice(0, 10);

  if (format === "csv") {
    return fileResponse(
      contactsToCsv(await exportContacts(parsed.options)),
      "text/csv",
      `dhaga-contacts-${stamp}.csv`,
    );
  }
  if (format === "vcard") {
    return fileResponse(
      contactsToVCards(await exportContacts(parsed.options)),
      "text/vcard",
      `dhaga-contacts-${stamp}.vcf`,
    );
  }
  return fileResponse(
    JSON.stringify(await exportEverything(), null, 2),
    "application/json",
    `dhaga-export-${stamp}.json`,
  );
}

function fileResponse(
  body: string,
  contentType: string,
  filename: string,
): Response {
  return new Response(body, {
    headers: {
      "Content-Type": `${contentType}; charset=utf-8`,
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
