"use client";

import { Star } from "lucide-react";
import { toggleStarAction } from "@/lib/actions/star";
import { useOptimisticToggle } from "@/lib/hooks/useOptimisticToggle";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Star / unstar a contact — an optimistic icon toggle reused on the contact
 * header, the People/Saved table rows, and the home contact sheet. The star
 * fills instantly and reverts (with a toast) only if the server rejects it.
 * Stops propagation so tapping it inside a clickable row/card never navigates.
 */
export function StarButton({
  contactId,
  starred,
  className,
}: {
  contactId: string;
  starred: boolean;
  className?: string;
}) {
  const { value: isStarred, pending, set } = useOptimisticToggle({
    value: starred,
    mutate: async (next) => {
      const formData = new FormData();
      formData.set("contactId", contactId);
      formData.set("starred", String(next));
      const result = await toggleStarAction({ ok: true }, formData);
      if (!result.ok) throw new Error(result.error ?? "Couldn't update star.");
    },
    errorMessage: "Couldn't update star — try again.",
  });

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      disabled={pending}
      aria-pressed={isStarred}
      aria-label={isStarred ? "Unstar contact" : "Star contact"}
      className={cn("text-fog hover:text-amber", isStarred && "text-amber", className)}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        set(!isStarred);
      }}
    >
      <Star className={cn("size-4", isStarred && "fill-amber")} />
    </Button>
  );
}
