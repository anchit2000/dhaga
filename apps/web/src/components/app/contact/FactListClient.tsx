"use client";

import { useRouter } from "next/navigation";
import { addFactAction } from "@/lib/actions/manual-entries";
import { useOptimisticList } from "@/lib/hooks/useOptimisticList";
import { formatDate } from "@/utils/format-date";
import type { FactWithReceipt } from "@/lib/repo/notes";
import { FactItem } from "./FactItem";
import { AddFactForm } from "./AddFactForm";

/** Interactive fact list: a manually added fact shows optimistically
 *  (useOptimisticList), then the server write + router.refresh reconcile it; a
 *  failed write rolls it back with a Retry toast. `factTypes` arrives as a prop
 *  from the server FactList so this client component never imports @dhaga/core.
 */
export function FactListClient({
  contactId,
  facts,
  factTypes,
}: {
  contactId: string;
  facts: FactWithReceipt[];
  factTypes: readonly string[];
}) {
  const router = useRouter();
  const { items, add } = useOptimisticList<FactWithReceipt>({
    items: facts,
    errorMessage: "Couldn't add that fact — try again.",
  });

  function handleAdd(text: string, type: string): void {
    const optimisticFact: FactWithReceipt = {
      id: `optimistic-${crypto.randomUUID()}`,
      contactId,
      type,
      text,
      confidence: 1,
      unverified: false,
      sourceNoteId: null,
      createdAt: new Date(),
      deletedAt: null,
      noteCreatedAt: null,
    };
    add(optimisticFact, async () => {
      const data = new FormData();
      data.set("contactId", contactId);
      data.set("type", type);
      data.set("text", text);
      const result = await addFactAction({}, data);
      if (result.error) return result.error;
      router.refresh();
      return null;
    });
  }

  return (
    <div className="space-y-2.5">
      {items.length === 0 ? (
        <p className="text-sm text-fog">
          No facts yet — jot one down below, or add a note and they get extracted automatically.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {items.map((fact) => (
            <FactItem
              key={fact.id}
              contactId={contactId}
              factId={fact.id}
              text={fact.text}
              type={fact.type}
              unverified={fact.unverified}
              receipt={
                fact.noteCreatedAt ? `from note, ${formatDate(fact.noteCreatedAt)}` : null
              }
            />
          ))}
        </ul>
      )}
      <AddFactForm factTypes={factTypes} onAdd={handleAdd} />
    </div>
  );
}
