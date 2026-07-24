import type { ReactNode } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface InstructionSource {
  label: string;
  body: ReactNode;
}

const SOURCES: InstructionSource[] = [
  {
    label: "iPhone / iCloud",
    body: (
      <>
        On a Mac or computer, sign in to <strong>iCloud.com &rarr; Contacts</strong>,
        press &#8984;A / Ctrl+A to select everyone, then click the gear
        (bottom-left) &rarr; <strong>Export vCard</strong>. On the iPhone itself you
        can also open a single contact &rarr; <strong>Share Contact &rarr; .vcf</strong>,
        but iCloud.com exports everyone at once.
      </>
    ),
  },
  {
    label: "Android (on device)",
    body: (
      <>
        Open the <strong>Contacts</strong> app &rarr; menu &rarr;{" "}
        <strong>Settings</strong> &rarr; <strong>Export</strong> &rarr;{" "}
        <strong>Export to .vcf file</strong>, then move that file to your computer.
      </>
    ),
  },
  {
    label: "Google Contacts",
    body: (
      <>
        Go to <strong>contacts.google.com &rarr; Export</strong> (left sidebar) and
        choose <strong>vCard</strong> for the .vcf importer &mdash; or{" "}
        <strong>Google CSV</strong>, which is also supported here.
      </>
    ),
  },
  {
    label: "LinkedIn",
    body: (
      <>
        Go to <strong>My Network &rarr; Connections &rarr; Manage synced contacts</strong>{" "}
        (or <strong>Data privacy &rarr; Get a copy of your data &rarr; Connections</strong>),
        then upload the <strong>Connections.csv</strong>.
      </>
    ),
  },
];

/**
 * Static, collapsible per-source export guide shown on the import empty state.
 * Purely instructional (no client state of its own) — the file parsing that
 * these steps feed happens entirely in the browser.
 */
export function ImportInstructions() {
  return (
    <div className="mx-auto mt-6 max-w-md text-left">
      <p className="text-xs leading-relaxed text-fog">
        Everything is parsed in your browser — only the rows you pick are
        uploaded, and every imported field keeps a receipt.
      </p>
      <Accordion multiple={false} className="mt-3">
        {SOURCES.map((source) => (
          <AccordionItem key={source.label} value={source.label}>
            <AccordionTrigger className="text-paper hover:no-underline">
              How to export from {source.label}
            </AccordionTrigger>
            <AccordionContent className="text-xs leading-relaxed text-fog">
              {source.body}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
