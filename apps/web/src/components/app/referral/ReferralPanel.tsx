"use client";

import { ShareBar } from "@/components/blog/ShareBar";
import { REFERRAL_REWARD_DAYS } from "@/utils/constants/referral";
import { CopyLinkButton } from "./CopyLinkButton";
import type { ReferralInfo } from "@dhaga/core/src/api/referral";
import type { ReactElement } from "react";

const SHARE_TITLE =
  "I'm using Dhaga, a privacy-first AI personal CRM. Sign up with my link and " +
  "we both get a free month of Pro.";

/** The advocate's referral surface: invite link, reward explainer, live
 *  counts, and social share of the invite URL. */
export function ReferralPanel({ referral }: { referral: ReferralInfo }): ReactElement {
  return (
    <section className="space-y-6 rounded-2xl border border-seam bg-panel p-5 sm:p-6">
      <div>
        <h2 className="font-display text-lg">A free month of Pro — for you and them</h2>
        <p className="mt-1 text-sm text-fog">
          Invite a friend with your link. When they sign up and verify their email,
          you each get {REFERRAL_REWARD_DAYS} days of Dhaga Pro.
        </p>
      </div>

      <div className="space-y-2">
        <p className="font-mono text-xs uppercase tracking-widest text-fog">Your invite link</p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <code className="min-w-0 flex-1 truncate rounded-xl border border-seam bg-ink/40 px-4 py-3 font-mono text-sm text-paper">
            {referral.inviteUrl}
          </code>
          <CopyLinkButton url={referral.inviteUrl} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Stat label="Rewarded" value={referral.rewardedCount} />
        <Stat label="Pending" value={referral.pendingCount} />
      </div>

      <ShareBar url={referral.inviteUrl} title={SHARE_TITLE} />
    </section>
  );
}

function Stat({ label, value }: { label: string; value: number }): ReactElement {
  return (
    <div className="rounded-xl border border-seam bg-ink/40 p-4">
      <p className="font-display text-2xl text-paper">{value}</p>
      <p className="mt-1 font-mono text-xs uppercase tracking-widest text-fog">{label}</p>
    </div>
  );
}
