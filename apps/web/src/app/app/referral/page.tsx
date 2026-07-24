import { requireUserIdForPage } from "@/lib/auth/guard";
import { loadReferralInfo } from "@/lib/referral";
import { ReferralPanel } from "@/components/app/referral";

export const metadata = { title: "Refer a friend — Dhaga" };

export default async function ReferralPage() {
  const userId = await requireUserIdForPage();
  const referral = await loadReferralInfo(userId);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-2xl tracking-tight">Refer a friend</h1>
        <p className="mt-1 text-sm text-fog">
          Share Dhaga and you both get Pro, on the house.
        </p>
      </div>
      {referral ? (
        <ReferralPanel referral={referral} />
      ) : (
        <div className="rounded-2xl border border-seam bg-panel p-5">
          <p className="text-sm text-fog">
            Referrals aren&rsquo;t available on this instance.
          </p>
        </div>
      )}
    </div>
  );
}
