/**
 * Subscription-row persistence. Split per the 150-line rule — the import path
 * `../repo` is unchanged: ./read holds the lookups, ./write the upsert and the
 * narrow patchers, ./plan-state the denormalised-plan-state shape they share,
 * ./connection the EE-pool handle they all run on.
 */
export {
  getSubscriptionByStripeCustomerId,
  getSubscriptionByStripeSubscriptionId,
  getSubscriptionForUser,
  getUserEmail,
} from "./read";
export {
  patchSubscriptionForUser,
  updateSubscriptionStatusByStripeId,
  upsertSubscription,
  type UpsertInput,
} from "./write";
export type { PlanStateFields, ScheduledChangeFields } from "./plan-state";
