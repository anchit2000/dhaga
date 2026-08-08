import Link from "next/link";
import { LegalPage, type LegalSection } from "@/components/legal/LegalPage";
import {
  LEGAL_ENTITY,
  REFUND_PROCESSING_DAYS,
  SUPPORT_FIRST_REPLY_DAYS,
} from "@/utils/constants/legal";
import { publicPageMetadata } from "@/utils/public-page-metadata";

export const metadata = publicPageMetadata("refunds");

/**
 * ⚠️ REVIEW BEFORE RELYING ON THIS — and note it makes a commercial promise
 * (the 7-day window) that nothing in the product enforces yet: refunds are
 * issued by hand in the Stripe/Razorpay dashboard, and a refund does NOT
 * currently revoke access on its own. Decide whether to keep the window before
 * this goes live.
 */
const SECTIONS: LegalSection[] = [
  {
    heading: "Cancel whenever you like",
    body: "Settings → Plan & billing cancels your subscription. There is no cancellation fee and no notice period. Cancelling stops the next renewal — it does not cut you off mid-term: you keep the paid plan until the end of the period you already paid for, and then drop to the free tier.",
  },
  {
    heading: "Your data survives cancellation",
    body: (
      <>
        Dropping to free never deletes your graph. Everything stays exportable
        as CSV, vCard or JSON, and you can delete your account and its data
        yourself at any time — see the{" "}
        <Link href="/privacy" className="text-ember underline-offset-2 hover:underline">Privacy page</Link>.
        Free-tier limits (notably the monthly AI credit allowance) apply from
        the moment the paid period ends.
      </>
    ),
  },
  {
    heading: "Refund window",
    body: "If Dhaga isn't for you, write to us within 7 days of a charge and we'll refund it in full — first payment or a renewal. Beyond that window we don't refund unused time on a term you've already started, because cancelling stops the next charge and the current one has already bought you the period you're in.",
  },
  {
    heading: "When we refund outside the window",
    body: "We'd rather fix it than argue. If you were charged twice, charged after cancelling, or the service was unusable for a meaningful stretch of your billing period, tell us and we'll make it right regardless of the 7 days.",
  },
  {
    heading: "How to ask",
    body: `Email ${LEGAL_ENTITY.supportEmail} from the address on the account, and say which charge you mean. We reply within ${SUPPORT_FIRST_REPLY_DAYS} working days.`,
  },
  {
    heading: "How long it takes",
    body: `An approved refund is issued within ${REFUND_PROCESSING_DAYS} working days, to the original payment method — we cannot send it anywhere else. Your bank or card issuer then takes its own time to post it, typically another 5–10 working days, which is outside our control. Refunds are made in the currency you were charged in; if your bank converted it, exchange-rate movement between the charge and the refund is theirs, not ours.`,
  },
  {
    heading: "Chargebacks",
    body: "Please talk to us before raising a chargeback. A disputed charge freezes the account while the processor investigates, which is slower and worse for you than an email that we can act on the same week.",
  },
];

export default function RefundsPage(): React.ReactElement {
  return (
    <LegalPage
      title="Refunds & cancellation"
      updated="8 August 2026"
      intro="Cancel in one click, keep your data, and get your money back within 7 days of a charge if Dhaga isn't working out."
      sections={SECTIONS}
    />
  );
}
