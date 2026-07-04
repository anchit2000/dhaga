/**
 * Dhaga Cloud only — proprietary, see LICENSE. Exports the four gates
 * apps/web/src/lib/hosted/gate.ts dynamically imports when
 * DHAGA_HOSTED_MODE=true. Never imported unconditionally by AGPL core.
 */
// Kept minimal and stable — matches apps/web's ambient fallback shape
// exactly (src/types/dhaga-ee.d.ts). Everything else (admin queries,
// access-request review, billing checkout) is reached via the subpath
// exports below, which routes that are themselves EE-exclusive import
// directly — see package.json's "exports" map.
export { tenantGate } from "./tenant";
export { signupGate } from "./access-requests";
export { adminGate } from "./admin";
export { billingGate } from "./billing";
