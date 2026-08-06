import { BookOpen, Building2, CalendarDays, CirclePlus, Gift, GitMerge, Home, Inbox, ListTodo, MapPin, Newspaper, Shapes, Sparkles, Star, Upload, Users, Waypoints } from "lucide-react";
import type { RecentReason } from "@/lib/repo/last-touch";

export const SESSION_COOKIE = "dhaga_session";

export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

/** Primary nav pills, always visible. */
export const APP_NAV_LINKS = [
  { href: "/app", label: "Home", icon: Home },
  { href: "/app/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/app/tasks", label: "Tasks", icon: ListTodo },
  { href: "/app/confirmations", label: "Confirmations", icon: Inbox },
  { href: "/app/graph", label: "Graph", icon: Waypoints },
  { href: "/app/map", label: "Map", icon: MapPin },
] as const;

/**
 * Secondary destinations, tucked under the nav's "More" menu. The trailing
 * entries (Blog, Docs) point outside the /app tree; MoreMenu separates them
 * from the in-app pages with a divider.
 */
export const APP_MORE_LINKS = [
  { href: "/app/people", label: "People", icon: Users },
  { href: "/app/companies", label: "Companies", icon: Building2 },
  { href: "/app/saved", label: "Saved", icon: Star },
  { href: "/app/events", label: "Events", icon: CalendarDays },
  { href: "/app/entities", label: "Entities", icon: Shapes },
  { href: "/app/quick-add", label: "Quick add", icon: CirclePlus },
  { href: "/app/import", label: "Import", icon: Upload },
  { href: "/app/sync/conflicts", label: "Sync conflicts", icon: GitMerge },
  { href: "/app/wrapped", label: "Wrapped", icon: Sparkles },
  { href: "/app/referral", label: "Invite friends", icon: Gift },
  { href: "/blog", label: "Blog", icon: Newspaper },
  { href: "/docs", label: "Docs", icon: BookOpen },
] as const;

export const HOME_PREVIEW_LIMIT = 5;

/** Badge wording for a "Recent people" row's `reason` (repo/last-touch.ts). */
export const RECENT_REASON_LABELS: Record<RecentReason, string> = {
  added: "recently added",
  interacted: "recently interacted",
};
