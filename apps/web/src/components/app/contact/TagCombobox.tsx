"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
} from "@/components/ui/combobox";
import { toastError } from "@/components/app/feedback";
import {
  addTagToContactAction,
  listTagSuggestionsAction,
} from "@/lib/actions/contacts";

/**
 * Contact-page control: a compact "Add tag" button that opens a searchable
 * dropdown of every tag already in use elsewhere (with an inline "Add" affordance
 * for a brand-new one), mirroring `AddToEventPicker`'s trigger+popup shape.
 * Unlike groups, tags have no id/table — picking a suggestion and typing a new
 * one both just call `addTagToContactAction`, so there's no separate onCreate.
 */
export function TagCombobox({
  contactId,
  currentTags,
}: {
  contactId: string;
  currentTags: string[];
}): React.ReactElement {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [allTags, setAllTags] = useState<string[] | null>(null);
  const currentSet = useMemo(
    () => new Set(currentTags.map((tag) => tag.toLowerCase())),
    [currentTags],
  );

  useEffect(() => {
    if (!open || allTags !== null) return;
    listTagSuggestionsAction().then(setAllTags);
  }, [open, allTags]);

  const suggestions = (allTags ?? []).filter(
    (tag) => !currentSet.has(tag.toLowerCase()),
  );
  const trimmed = query.trim();
  const showCreate =
    trimmed.length > 0 &&
    !suggestions.some((tag) => tag.toLowerCase() === trimmed.toLowerCase());

  function assign(tag: string): void {
    startTransition(async () => {
      const result = await addTagToContactAction(contactId, tag);
      if (!result.ok) {
        toastError(result.error, () => assign(tag));
        return;
      }
      toast.success(`Tagged “${tag}”.`);
      setQuery("");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Combobox<string>
      items={suggestions}
      inputValue={query}
      onInputValueChange={setQuery}
      onValueChange={(tag) => tag && assign(tag)}
      itemToStringLabel={(tag) => tag}
      open={open}
      onOpenChange={setOpen}
      disabled={pending}
    >
      <ComboboxTrigger
        render={<Button type="button" variant="outline" size="sm" className="h-7 rounded-full px-2.5 text-xs" />}
        disabled={pending}
      >
        <Plus aria-hidden className="size-3" />
        Add tag
      </ComboboxTrigger>

      <ComboboxContent>
        <div className="p-1">
          <ComboboxInput placeholder="Search or create a tag…" aria-label="Search or create a tag" />
        </div>
        <ComboboxList>
          {(tag: string) => (
            <ComboboxItem key={tag} value={tag}>
              {tag}
            </ComboboxItem>
          )}
        </ComboboxList>
        {suggestions.length === 0 && !showCreate ? (
          <ComboboxEmpty>{trimmed ? "No matches." : "No tags yet."}</ComboboxEmpty>
        ) : null}
        {showCreate ? (
          <button
            type="button"
            onClick={() => assign(trimmed)}
            className="flex min-h-11 w-full items-center gap-2 px-3 py-2 text-left text-sm text-ember hover:bg-wash/[0.05]"
          >
            <Plus aria-hidden className="size-4" />
            Add “{trimmed}”
          </button>
        ) : null}
      </ComboboxContent>
    </Combobox>
  );
}
