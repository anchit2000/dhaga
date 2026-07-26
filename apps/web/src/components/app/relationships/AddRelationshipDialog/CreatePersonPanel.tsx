"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { quickCreateContactAction } from "@/lib/actions/contacts";
import { FormError } from "@/components/app/feedback";
import type { GraphTarget } from "@/lib/repo/graph-data";

/** Inline quick-add of a person who isn't in the graph yet: name (required)
 *  plus an optional current role. On save the new contact is handed back as a
 *  target so the add-relationship flow continues without leaving the dialog —
 *  mirrors CreateTypePanel's inline relationship-type creation. */
export function CreatePersonPanel({
  initialName,
  onCreated,
  onCancel,
}: {
  initialName: string;
  onCreated: (target: GraphTarget) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initialName);
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function createPerson(): void {
    startTransition(async () => {
      const result = await quickCreateContactAction({ name, title, company });
      if (result.error || !result.target) {
        setError(result.error ?? "Could not add the person.");
        return;
      }
      onCreated(result.target);
    });
  }

  return (
    <div className="mt-2 space-y-2 rounded-xl border border-seam bg-wash/[0.02] p-3">
      <div>
        <Label htmlFor="new-person-name" className="mb-1.5 text-fog">Name</Label>
        <Input
          id="new-person-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Vandana Srivastava"
        />
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div>
          <Label htmlFor="new-person-title" className="mb-1.5 text-fog">Title</Label>
          <Input
            id="new-person-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Optional"
          />
        </div>
        <div>
          <Label htmlFor="new-person-company" className="mb-1.5 text-fog">Company</Label>
          <Input
            id="new-person-company"
            value={company}
            onChange={(event) => setCompany(event.target.value)}
            placeholder="Optional"
          />
        </div>
      </div>
      <FormError message={error} />
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          loading={pending}
          disabled={!name.trim()}
          onClick={createPerson}
        >
          Add person
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
