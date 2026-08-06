"use server";

import { requireUserId } from "@/lib/auth/guard";
import { withUserDb } from "@/lib/db/request-scope";
import { SAVE_RETRY_MESSAGE, logActionError } from "@/lib/actions/resilience";
import { createContactProfile } from "@/lib/repo/contacts";
import { profileFromExtracted } from "@dhaga/core";
import type { GraphTarget } from "@/lib/repo/graph-data";

export interface QuickContactResult {
  target?: GraphTarget;
  error?: string;
}

/**
 * Create a bare-bones contact inline — name plus an optional current role — and
 * hand it back as a GraphTarget, so the add-relationship dialog can connect to
 * someone who isn't in the graph yet without leaving the flow. Deliberately
 * lighter than createContactAction: it neither redirects (the caller stays in
 * the dialog) nor carries capture extras, and takes only the few fields a quick
 * add needs. Reuses createContactProfile, so a matching "mentioned" stub is
 * promoted rather than duplicated. withUserDb pins one scoped connection across
 * the write (createContactProfile fans out a getDb() per distinct company).
 */
export async function quickCreateContactAction(input: {
  name: string;
  title?: string | null;
  company?: string | null;
}): Promise<QuickContactResult> {
  const userId = await requireUserId();
  const name = input.name.trim();
  if (!name) return { error: "Name is required." };
  const title = input.title?.trim() || null;
  const company = input.company?.trim() || null;

  try {
    const id = await withUserDb(userId, () =>
      createContactProfile(
        profileFromExtracted({
          name,
          title,
          company,
          emails: [],
          phones: [],
          links: [],
          location: null,
        }),
        "manual",
      ),
    );
    // Mirror the contact sublabel the typeahead builds (title · company).
    const sublabel = [title, company].filter(Boolean).join(" · ") || null;
    return { target: { id, label: name, kind: "contact", sublabel } };
  } catch (error) {
    logActionError("quickCreateContact", error);
    return { error: SAVE_RETRY_MESSAGE };
  }
}
