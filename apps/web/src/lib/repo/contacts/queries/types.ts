import type { RecentReason } from "@/lib/repo/last-touch";

/** The select shape every contact list query returns. */
export interface ContactListItem {
  id: string;
  name: string;
  title: string | null;
  companyName: string | null;
  tags: string[];
  starred: boolean;
  createdAt: Date;
}

/** A `listContacts` row: ordered by last touch, so it also carries WHY it is
 *  recent. Only that query can answer the "why", hence the narrower type — the
 *  paginated/table queries keep returning plain `ContactListItem`. */
export interface RecentContactListItem extends ContactListItem {
  reason: RecentReason;
}

/** A name-match hit: enough to disambiguate one person from another. */
export interface ContactIdentityCandidate {
  id: string;
  name: string;
  title: string | null;
  companyName: string | null;
}
