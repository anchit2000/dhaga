import Link from "next/link";
import { LegalPage, type LegalSection } from "@/components/legal/LegalPage";
import { GITHUB_REPO_URL } from "@/utils/constants/site";
import { LEGAL_ENTITY, SUPPORT_FIRST_REPLY_DAYS } from "@/utils/constants/legal";
import { publicPageMetadata } from "@/utils/public-page-metadata";

export const metadata = publicPageMetadata("contact");

/**
 * ⚠️ Every detail here comes from utils/constants/legal, which is still
 * placeholders. A payment gateway will check that this page names a real
 * business, a reachable address and a working phone number.
 */
const SECTIONS: LegalSection[] = [
  {
    heading: "Support",
    body: `${LEGAL_ENTITY.supportEmail} — the fastest way to reach a person. We reply within ${SUPPORT_FIRST_REPLY_DAYS} working days. If you're writing about a charge, send it from the address on the account and say which charge you mean.`,
  },
  {
    heading: "Phone",
    body: `${LEGAL_ENTITY.phone}, ${LEGAL_ENTITY.supportHours}.`,
  },
  {
    heading: "Registered address",
    body: `${LEGAL_ENTITY.name}, ${LEGAL_ENTITY.address}.`,
  },
  {
    heading: "Billing, refunds and cancellation",
    body: (
      <>
        Cancel yourself in Settings → Plan &amp; billing. The window and the
        timings are on the{" "}
        <Link href="/refunds" className="text-ember underline-offset-2 hover:underline">
          Refunds &amp; cancellation page
        </Link>
        .
      </>
    ),
  },
  {
    heading: "Privacy, data and deletion",
    body: (
      <>
        Export and account deletion are both self-service and don&apos;t need to
        go through us. What we hold and why is on the{" "}
        <Link href="/privacy" className="text-ember underline-offset-2 hover:underline">
          Privacy page
        </Link>
        ; write to support for anything it doesn&apos;t answer.
      </>
    ),
  },
  {
    heading: "Security reports",
    body: (
      <>
        Please report vulnerabilities privately rather than opening a public
        issue — see{" "}
        <a
          href={`${GITHUB_REPO_URL}/blob/main/SECURITY.md`}
          className="text-ember underline-offset-2 hover:underline"
        >
          SECURITY.md
        </a>
        .
      </>
    ),
  },
  {
    heading: "Bugs and feature requests",
    body: (
      <>
        There&apos;s a feedback button inside the app, which tags your report
        with the page you were on. For anything about the open-source core,{" "}
        <a
          href={`${GITHUB_REPO_URL}/issues`}
          className="text-ember underline-offset-2 hover:underline"
        >
          GitHub issues
        </a>{" "}
        is the better venue — it&apos;s public and you can follow the fix.
      </>
    ),
  },
];

export default function ContactPage(): React.ReactElement {
  return (
    <LegalPage
      title="Contact"
      updated="8 August 2026"
      intro="A real person reads these. Support is email-first because it leaves both of us a record."
      sections={SECTIONS}
    />
  );
}
