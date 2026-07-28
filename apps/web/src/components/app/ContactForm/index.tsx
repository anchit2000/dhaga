"use client";

import { useActionState, useState } from "react";
import { createContactAction, type ContactFormState } from "@/lib/actions/contacts";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormError } from "@/components/app/feedback";
import { SubmitButton } from "../SubmitButton";
import { EducationSection, MethodSection, PositionSection } from "./sections";
import { MoreDetails } from "./more-details";
import { buildProfilePayload } from "./payload";
import { splitPositionGroups } from "./position-groups";
import type { ContactProfile, Position } from "@dhaga/core";

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

  // One position list in state, edited as two groups. Each group writes back
  // its slice (Experience first); see splitPositionGroups for the why.
  const { experience: experienceItems, education: educationItems } = splitPositionGroups(
    profile.positions,
  );
  const setExperience = (next: Position[]) => patch({ positions: [...next, ...educationItems] });
  const setEducation = (next: Position[]) => patch({ positions: [...experienceItems, ...next] });

  return (
    <form action={formAction} className="@container space-y-5">
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

      {/* On a wide surface (the widened manual-add dialog) the groups sit in two
          columns — the position history (Experience + Education) beside the
          contact methods — instead of one tall stack. Narrow surfaces (edit/new
          pages, ~624px) stay single-column via the @container query, so those
          pages are unchanged. */}
      <div className="grid gap-5 @3xl:grid-cols-2 @3xl:items-start">
        <div className="space-y-5">
          <PositionSection items={experienceItems} onChange={setExperience} />
          <EducationSection items={educationItems} onChange={setEducation} />
        </div>
        <div className="space-y-5">
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
        </div>
      </div>

      <MoreDetails profile={profile} patch={patch} />

      {children}
      <FormError message={state.error} />
      <SubmitButton>{submitLabel}</SubmitButton>
    </form>
  );
}
