/** Settings page tab layout. One `/app/settings` route, grouped into tabs. */

export const SETTINGS_TABS = [
  { value: "account", label: "Account" },
  { value: "credits", label: "Credits" },
  { value: "capture", label: "Capture" },
  { value: "calendar", label: "Calendar" },
  { value: "messaging", label: "Messaging" },
  { value: "suggestions", label: "Suggestions" },
  { value: "import", label: "Import" },
] as const;

export type SettingsTab = (typeof SETTINGS_TABS)[number]["value"];

/**
 * Deep-link hash → which tab owns that section, so existing anchors keep
 * working after the split: `#import` (import redirect / provider OAuth),
 * `#voice-dictation` (dictation "configure engine" toast) and `#voice-teaching`
 * all resolve to a tab. The `?calendar=` OAuth return is handled separately
 * (a query param, not a hash) and always wins.
 */
export const SETTINGS_HASH_TO_TAB: Record<string, SettingsTab> = {
  account: "account",
  credits: "credits",
  capture: "capture",
  "voice-dictation": "capture",
  "voice-teaching": "capture",
  calendar: "calendar",
  messaging: "messaging",
  suggestions: "suggestions",
  import: "import",
};
