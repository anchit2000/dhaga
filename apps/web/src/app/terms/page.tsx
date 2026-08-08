import Link from "next/link";
import { LegalPage, type LegalSection } from "@/components/legal/LegalPage";
import { GITHUB_REPO_URL } from "@/utils/constants/site";
import { LEGAL_ENTITY } from "@/utils/constants/legal";
import { publicPageMetadata } from "@/utils/public-page-metadata";

export const metadata = publicPageMetadata("terms");

/**
 * ⚠️ REVIEW BEFORE RELYING ON THIS. Written to describe what Dhaga Cloud
 * actually does today — beta, invite-only, two processors, AGPL core — rather
 * than to be a generic template, but it has not been reviewed by a lawyer and
 * the entity details it quotes are still placeholders (utils/constants/legal).
 */
const SECTIONS: LegalSection[] = [
  {
    heading: "Who you are contracting with",
    body: `Dhaga Cloud is operated by ${LEGAL_ENTITY.name}, ${LEGAL_ENTITY.address}. "We" and "us" mean that entity; "you" means the account holder. Using the service means you accept these terms.`,
  },
  {
    heading: "Dhaga Cloud is in beta",
    body: "Accounts are created immediately but access is queued: an admin approves you, or starting a paid plan lets you in as soon as the payment completes. Beta means features change, and it means we may occasionally take the service down. It does not mean your data is treated as disposable — export works throughout.",
  },
  {
    heading: "Your account",
    body: "You are responsible for keeping your credentials safe and for what happens under your account. One person per account; don't share logins. Tell us promptly if you think someone else has access.",
  },
  {
    heading: "Your data, and what we do with it",
    body: (
      <>
        Your contacts, notes and everything derived from them stay yours. We
        process them to run the service and nothing else — we do not sell them,
        and we do not train models on them. What we collect and why is set out
        in the <Link href="/privacy" className="text-ember underline-offset-2 hover:underline">Privacy page</Link>.
        You can export everything, or delete your account and its data, at any
        time.
      </>
    ),
  },
  {
    heading: "What you may not do",
    body: "Don't use Dhaga to store data you have no right to hold, to send unsolicited bulk mail, to break the law of the place you're in, or to attack the service — scraping, load-testing without asking, or trying to reach another account's data. We can suspend an account that does, and we'll tell you why.",
  },
  {
    heading: "AI features",
    body: "AI output is a draft, not advice. It is generated from your own notes and can be wrong, so check anything you act on. Every AI-derived fact links back to the note it came from precisely so you can check it. AI actions are metered in credits against your plan's monthly allowance.",
  },
  {
    heading: "Plans, billing and taxes",
    body: (
      <>
        Paid plans are subscriptions, billed monthly or yearly in advance, and
        they renew automatically until cancelled. Prices are shown on the{" "}
        <Link href="/pricing" className="text-ember underline-offset-2 hover:underline">Pricing page</Link>{" "}
        in the currency you check out in; taxes are added where they apply.
        Cancellation and refunds are covered on the{" "}
        <Link href="/refunds" className="text-ember underline-offset-2 hover:underline">Refunds &amp; cancellation page</Link>.
        We may change prices with at least 30 days&apos; notice before your next
        renewal.
      </>
    ),
  },
  {
    heading: "The open-source core",
    body: (
      <>
        Dhaga&apos;s core is AGPL-3.0 and you may self-host it — these terms
        cover the hosted service only, and your rights under that licence are
        unaffected by them. The source is{" "}
        <a href={GITHUB_REPO_URL} className="text-ember underline-offset-2 hover:underline">
          on GitHub
        </a>
        ; the cloud-only components under <code>packages/ee</code> are licensed
        separately and are not AGPL.
      </>
    ),
  },
  {
    heading: "Availability and liability",
    body: "We work to keep the service up but do not promise a specific uptime while it is in beta, and it is provided as-is. To the extent the law allows, our total liability for any claim is capped at what you paid us in the twelve months before it arose. Nothing here limits liability that cannot lawfully be limited.",
  },
  {
    heading: "Ending it",
    body: "You can cancel or delete your account whenever you like. We can end an account for a serious or repeated breach of these terms, or if we discontinue the service — in which case we'll give notice and time to export, and refund the unused part of a prepaid term.",
  },
  {
    heading: "Changes, and how to reach us",
    body: (
      <>
        We&apos;ll post material changes here and date them at the top before
        they take effect. Questions about these terms:{" "}
        <Link href="/contact" className="text-ember underline-offset-2 hover:underline">Contact</Link>.
      </>
    ),
  },
];

export default function TermsPage(): React.ReactElement {
  return (
    <LegalPage
      title="Terms of service"
      updated="8 August 2026"
      intro="The agreement between you and us for Dhaga Cloud — what you can expect, what we expect, and what happens about money. Plain language on purpose."
      sections={SECTIONS}
    />
  );
}
