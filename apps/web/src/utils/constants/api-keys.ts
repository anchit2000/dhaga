/**
 * Copy for the `multi_device_sync` payment gate on minting a personal access
 * token (utils/constants/plans.ts). One string, used twice on purpose: the
 * settings UI shows it PRE-click next to the greyed control, and
 * `createApiKeyAction` returns it when the server refuses — so the explanation
 * a user reads before clicking can never disagree with the one they get after.
 * Same argument as ./ai-gate.ts makes for the credit gate.
 */
export const API_KEY_PLAN_GATE_REASON =
  "Creating tokens needs a Pro or Power plan — they're how the mobile app, your scripts and local MCP clients sign in as you. Tokens you already have keep working.";
