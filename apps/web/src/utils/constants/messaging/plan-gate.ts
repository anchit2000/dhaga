/**
 * Copy for the `multi_device_sync` payment gate on LINKING a WhatsApp or
 * Telegram chat (utils/constants/plans.ts). One string, used twice on purpose:
 * the settings UI shows it PRE-click on the greyed "Generate link token"
 * button, and `generateMessagingLinkTokenAction` returns it when the server
 * refuses — so the explanation a user reads before clicking can never disagree
 * with the toast they get after. Same argument ../api-keys.ts makes for tokens.
 */
export const MESSAGING_LINK_PLAN_GATE_REASON =
  "Connecting a WhatsApp or Telegram chat needs a Pro or Power plan. Chats you've already linked keep capturing, and you can disconnect them any time.";
