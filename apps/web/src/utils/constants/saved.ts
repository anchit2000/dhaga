/** Saved page tab layout — two collections behind one /app/saved route. */

import { Sparkle, Star } from "lucide-react";

export const SAVED_TABS = [
  { value: "starred", label: "Starred", icon: Star },
  { value: "watching", label: "Watching", icon: Sparkle },
] as const;

export type SavedTab = (typeof SAVED_TABS)[number]["value"];
