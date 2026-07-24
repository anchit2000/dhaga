/**
 * Contacts-provider gateway factory — same interface + impls + factory shape as
 * the LLM/Search gateways (CLAUDE.md). Callers depend on the {@link
 * ContactsProvider} contract, never a concrete provider. SERVER-ONLY.
 */
import type { ContactsProvider } from "./types";
import { GoogleContactsProvider } from "./google";
import { MicrosoftContactsProvider } from "./microsoft";

export type { ContactsProvider } from "./types";
export { GoogleContactsProvider, googlePersonToCandidate } from "./google";
export { MicrosoftContactsProvider, graphContactToCandidate } from "./microsoft";

/** Resolve the provider gateway for a social provider id. */
export function getContactsProvider(id: "google" | "microsoft"): ContactsProvider {
  switch (id) {
    case "google":
      return new GoogleContactsProvider();
    case "microsoft":
      return new MicrosoftContactsProvider();
  }
}
