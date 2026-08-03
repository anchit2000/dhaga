import type { OpenSlot } from "@dhaga/core";
import type { ConfirmationView } from "@/lib/repo/confirmations";
import type { ContactListItem, RecentContactListItem } from "@/lib/repo/contacts";
import type { DailySuggestion } from "@/lib/repo/daily-suggestions";
import type { EventListItem } from "@/lib/repo/events";
import type { GoalProgress } from "@/lib/repo/goals";
import type { DueReachOut, OpenFollowUpItem } from "@/lib/repo/reminders";
import type { SignalItem } from "@/lib/repo/signals";
import type { QuietContact } from "@/lib/repo/strength";
import type { NameCluster } from "@/lib/suggestions/name-clusters";

/** Everything Home's header + bento render, as ./load.ts assembles it. */
export interface DashboardData {
  people: RecentContactListItem[];
  events: EventListItem[];
  suggestions: DailySuggestion[];
  calendarConnected: boolean;
  slots: OpenSlot[];
  overloaded: boolean;
  meetingCountToday: number;
  moreDue: number;
  goalProgress: GoalProgress | null;
  openFollowUps: OpenFollowUpItem[];
  quietContacts: QuietContact[];
  newSignals: SignalItem[];
  starred: ContactListItem[];
  pendingConfirmations: ConfirmationView[];
  suggestedClusters: NameCluster[];
  dueReachOuts: DueReachOut[];
  now: Date;
}
