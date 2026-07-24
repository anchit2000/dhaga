import type { ImportCandidate } from "../types";

/**
 * A provider-agnostic contacts gateway — the same interface + impls + factory
 * shape as the LLM/Search gateways (CLAUDE.md). Each implementation owns one
 * OAuth-backed source (Google People, Microsoft Graph); adding another provider
 * is a new class + one factory case, zero changes to callers.
 *
 * SERVER-ONLY: `fetchContacts` calls third-party REST APIs with a bearer token
 * obtained server-side — never import this from a `"use client"` file.
 */
export interface ContactsProvider {
  /** Stable id, also the Better Auth social provider id and ImportFormat. */
  readonly id: "google" | "microsoft";
  /** The read-only contacts OAuth scope this provider needs. */
  readonly scope: string;
  /** Page the provider's API fully and map every row to a review candidate. */
  fetchContacts(accessToken: string): Promise<ImportCandidate[]>;
}
