"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { AddressSection, CustomFieldSection, DateSection } from "./more-sections";
import type { ContactProfile } from "@dhaga/core";

/**
 * The collapsed "More details" group: addresses, important dates, and custom
 * fields — the rich extras an import carries but a manual add rarely needs up
 * front, so they stay tucked behind an accordion.
 */
export function MoreDetails({
  profile,
  patch,
}: {
  profile: ContactProfile;
  patch: (part: Partial<ContactProfile>) => void;
}) {
  return (
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
  );
}
