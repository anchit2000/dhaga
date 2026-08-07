/**
 * EE's Drizzle tables. Split per the 150-line rule when the founding-seat
 * table landed — the import path `../db/schema` is unchanged, and the split
 * mirrors ./tables-ddl, which is already divided the same way: ./access holds
 * the core-table mirrors and the waiting list, ./billing the subscription row,
 * the founding seats and the payment ledger.
 */
export {
  accessRequests,
  eeAiActions,
  eeUser,
  type AccessRequestRow,
  type AccessRequestStatus,
} from "./access";
export {
  foundingSeats,
  payments,
  subscriptions,
  type FoundingSeatRow,
  type PaymentProcessor,
  type PaymentRow,
  type PaymentStatus,
  type SubscriptionPlan,
  type SubscriptionRow,
  type SubscriptionStatus,
} from "./billing";
