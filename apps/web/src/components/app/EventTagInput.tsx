"use client";

import { useState, type KeyboardEvent } from "react";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { EVENT_TAG_MAX, EVENT_TAG_MAX_LENGTH } from "@/utils/constants/events";

/**
 * Chip-style tag editor for a group. Each tag is mirrored to a hidden `tags`
 * input so the server action reads them via `formData.getAll("tags")`. Enter or
 * comma commits the draft; Backspace on an empty field removes the last chip.
 */
export function EventTagInput({ defaultTags = [] }: { defaultTags?: string[] }) {
  const [tags, setTags] = useState<string[]>(defaultTags);
  const [draft, setDraft] = useState("");
  const full = tags.length >= EVENT_TAG_MAX;

  function addTag(raw: string): void {
    const tag = raw.trim().toLocaleLowerCase().slice(0, EVENT_TAG_MAX_LENGTH);
    if (!tag || tags.includes(tag) || full) return;
    setTags((current) => [...current, tag]);
    setDraft("");
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      addTag(draft);
    } else if (event.key === "Backspace" && !draft && tags.length > 0) {
      setTags((current) => current.slice(0, -1));
    }
  }

  return (
    <div className="space-y-2">
      {tags.map((tag) => (
        <input key={tag} type="hidden" name="tags" value={tag} />
      ))}

      {tags.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="h-6 gap-1 pr-1">
              {tag}
              <button
                type="button"
                onClick={() => setTags((current) => current.filter((item) => item !== tag))}
                aria-label={`Remove ${tag}`}
                className="text-fog transition-colors hover:text-paper"
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      ) : null}

      <Input
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => addTag(draft)}
        disabled={full}
        placeholder={full ? "Tag limit reached" : "Add a tag, press Enter"}
        aria-label="Add a tag"
        className="h-8 text-xs sm:max-w-xs"
      />
    </div>
  );
}
