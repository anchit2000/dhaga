/**
 * Copy + wire format for the `multi_device_sync` payment gate on the MCP
 * endpoint (utils/constants/plans.ts). Sibling of ./api-keys.ts, and split from
 * it on purpose: minting a token and connecting an MCP client are two different
 * doors onto the same entitlement, and only one of them involves a token at all
 * (the OAuth connector path never sees one), so they need to explain themselves
 * separately.
 */

/**
 * Machine-readable refusal code. An MCP client reads the JSON body, not our
 * prose, and it has to be able to tell "you must pay" apart from "log in again"
 * — the difference between showing an upgrade prompt and looping the user
 * through a pointless OAuth round trip. Deliberately NOT an OAuth 2.0 error
 * code: nothing is wrong with the credential.
 */
export const MCP_PLAN_GATE_ERROR = "plan_required";

/**
 * The human half of the same refusal. Every field of it is doing work: the plan
 * names say what buys access, "your Dhaga account is fine" stops a client
 * re-authenticating against a wall, and naming the browser keeps someone from
 * concluding their whole account is locked.
 */
export const MCP_PLAN_GATE_REASON =
  "Dhaga's MCP server needs a Pro or Power plan. Your Dhaga account is fine — reconnecting won't help; upgrade in Settings, or keep using the graph in the browser.";

/**
 * Refusal for an account that exists but isn't approved — still waiting in the
 * queue, or revoked after a refund or chargeback. Separate from the plan gate
 * because the remedy is different (finish checkout / wait, vs. upgrade), and
 * separate from a 401 for the same reason the plan gate is: the credential is
 * valid, so re-authenticating loops forever.
 */
export const MCP_APPROVAL_GATE_ERROR = "account_not_approved";

export const MCP_APPROVAL_GATE_REASON =
  "This Dhaga account isn't approved yet. Your credential is valid — reconnecting won't help. Finish checkout to skip the queue, or wait for approval, then connect again.";
