"use client";

import { useActionState, useState } from "react";
import { createContactAction, type ContactFormState } from "@/lib/actions/contacts";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { SubmitButton } from "../SubmitButton";
import { MethodSection, PositionSection } from "./sections";
import { AddressSection, CustomFieldSection, DateSection } from "./more-sections";
import { buildProfilePayload } from "./payload";
import type { ContactProfile } from "@dhaga/core";

type ProfileAction = (
  previous: ContactFormState,
  formData: FormData,
) => Promise<ContactFormState>;

/**
 * Review-and-save form for the full contact profile: used for manual add,
 * extracted captures (which pass hidden capture fields via `children`), and
 * editing (which passes the `updateContactAction` + a hidden contactId). All
 * repeatable groups live in one controlled state object, serialized into a
 * single hidden `payload` field the server re-validates with Zod.
 */
export function ContactForm({
  initial,
  submitLabel,
  action = createContactAction,
  children,
}: {
  initial: ContactProfile;
  submitLabel: string;
  action?: ProfileAction;
  children?: React.ReactNode;
}) {
  const [state, formAction] = useActionState<ContactFormState, FormData>(action, {});
  const [profile, setProfile] = useState<ContactProfile>(initial);
  const patch = (part: Partial<ContactProfile>) =>
    setProfile((previous) => ({ ...previous, ...part }));

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="payload" value={buildProfilePayload(profile)} readOnly />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label htmlFor="name" className="mb-2 text-fog">
            Name
          </Label>
          <Input
            id="name"
            value={profile.name}
            required
            className="h-10"
            onChange={(event) => patch({ name: event.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="nickname" className="mb-2 text-fog">
            Nickname
          </Label>
          <Input
            id="nickname"
            value={profile.nickname ?? ""}
            className="h-10"
            onChange={(event) => patch({ nickname: event.target.value || null })}
          />
        </div>
        <div>
          <Label htmlFor="location" className="mb-2 text-fog">
            Location
          </Label>
          <Input
            id="location"
            value={profile.location ?? ""}
            className="h-10"
            onChange={(event) => patch({ location: event.target.value || null })}
          />
        </div>
      </div>

      <PositionSection items={profile.positions} onChange={(positions) => patch({ positions })} />
      <MethodSection
        title="Emails"
        items={profile.emails}
        onChange={(emails) => patch({ emails })}
        inputType="email"
        valuePlaceholder="name@example.com"
        labelPlaceholder="Work / Personal"
      />
      <MethodSection
        title="Phones"
        items={profile.phones}
        onChange={(phones) => patch({ phones })}
        inputType="tel"
        valuePlaceholder="+1 555 123 4567"
        labelPlaceholder="Mobile / Work"
      />
      <MethodSection
        title="Links"
        items={profile.links}
        onChange={(links) => patch({ links })}
        inputType="url"
        valuePlaceholder="https://…"
        labelPlaceholder="LinkedIn / Site"
      />

      <Accordion>
        <AccordionItem>
          <AccordionTrigger>More details</AccordionTrigger>
          <AccordionContent className="space-y-5">
            <AddressSection
              items={profile.addresses}
              onChange={(addresses) => patch({ addresses })}
            />
            <DateSection
              items={profile.importantDates}
              onChange={(importantDates) => patch({ importantDates })}
            />
            <CustomFieldSection
              items={profile.customFields}
              onChange={(customFields) => patch({ customFields })}
            />
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {children}
      {state.error ? (
        <p className="text-sm text-red-400" role="alert">
          {state.error}
        </p>
      ) : null}
      <SubmitButton>{submitLabel}</SubmitButton>
    </form>
  );
}
