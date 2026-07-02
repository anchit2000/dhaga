"use client";

import { useActionState } from "react";
import {
  createContactAction,
  type ContactFormState,
} from "@/lib/actions/contacts";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "./SubmitButton";
import type { ExtractedContact } from "@dhaga/core";

interface FieldSpec {
  name: string;
  label: string;
  hint?: string;
  value: string;
}

function fieldsFor(initial: ExtractedContact): FieldSpec[] {
  return [
    { name: "name", label: "Name", value: initial.name },
    { name: "title", label: "Title", value: initial.title ?? "" },
    { name: "company", label: "Company", value: initial.company ?? "" },
    {
      name: "emails",
      label: "Emails",
      hint: "comma-separated",
      value: initial.emails.join(", "),
    },
    {
      name: "phones",
      label: "Phones",
      hint: "comma-separated",
      value: initial.phones.join(", "),
    },
    {
      name: "links",
      label: "Links",
      hint: "comma-separated",
      value: initial.links.join(", "),
    },
    { name: "location", label: "Location", value: initial.location ?? "" },
  ];
}

/** Review-and-save form: used for manual add and for extracted captures. */
export function ContactForm({
  initial,
  submitLabel,
}: {
  initial: ExtractedContact;
  submitLabel: string;
}) {
  const [state, formAction] = useActionState<ContactFormState, FormData>(
    createContactAction,
    {},
  );

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {fieldsFor(initial).map((field) => (
          <div
            key={field.name}
            className={field.name === "name" ? "sm:col-span-2" : undefined}
          >
            <Label htmlFor={field.name} className="mb-2 text-fog">
              {field.label}
              {field.hint ? (
                <span className="font-normal text-fog/60">({field.hint})</span>
              ) : null}
            </Label>
            <Input
              id={field.name}
              name={field.name}
              defaultValue={field.value}
              required={field.name === "name"}
              className="h-10"
            />
          </div>
        ))}
      </div>
      {state.error ? (
        <p className="text-sm text-red-400" role="alert">
          {state.error}
        </p>
      ) : null}
      <SubmitButton>{submitLabel}</SubmitButton>
    </form>
  );
}
