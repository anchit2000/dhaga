import { requireUserIdFromRequest } from "@/lib/auth/guard";
import { exportContacts, exportEverything } from "@/lib/export/data";
import { contactsToCsv, contactsToVCards } from "@/lib/export/formats";

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
  const stamp = new Date().toISOString().slice(0, 10);

  if (format === "csv") {
    return fileResponse(
      contactsToCsv(await exportContacts()),
      "text/csv",
      `dhaga-contacts-${stamp}.csv`,
    );
  }
  if (format === "vcard") {
    return fileResponse(
      contactsToVCards(await exportContacts()),
      "text/vcard",
      `dhaga-contacts-${stamp}.vcf`,
    );
  }
  if (format === "json") {
    return fileResponse(
      JSON.stringify(await exportEverything(), null, 2),
      "application/json",
      `dhaga-export-${stamp}.json`,
    );
  }
  return new Response("Unknown format. Use csv, vcard, or json.", { status: 404 });
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
