import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, isUserApproved } from "@/lib/auth/guard";
import { preferredProcessor } from "@/lib/billing/processor";
import { getBillingGate } from "@/lib/hosted/gate";
import { ModeToggle } from "@/components/brand/ModeToggle";
import { ThreadMark } from "@/components/brand/ThreadMark";
import { PendingCheckout } from "./PendingCheckout";
import { SignOutButton } from "./SignOutButton";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "You're on the list — Dhaga",
  description: "Your Dhaga account is waiting for approval.",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

/**
 * Where an authenticated but unapproved account lands. Deliberately OUTSIDE
 * /app: that layout is guarded by requireUserIdForPage (which redirects here,
 * so the page would loop) and fetches the whole app shell — nav counts,
 * reminders, notifications — for someone who has no graph yet.
 *
 * Approved users are bounced to /app, so the URL is never a dead end for
 * someone who was let in while the tab sat open, and signed-out visitors go to
 * /login. On a core-only self-host isUserApproved is always true, which makes
 * this page permanently unreachable there — exactly right, since that instance
 * has no waiting list.
 */
export default async function PendingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (await isUserApproved(user.id)) redirect("/app");

  // Null when this instance sells nothing (no processor configured) — then the
  // only way out is an admin, and the page says so rather than showing a buy
  // button that would throw.
  const gate = await getBillingGate();
  const summary = await gate.getPlanSummary(user.id);
  // Null unless Founding Pro is configured AND seats remain. The count shown is
  // a hint; the cap is enforced when the checkout is created.
  const founding = await gate.getFoundingOffer();
  const preferred = await preferredProcessor();

  return (
    <main className="relative flex min-h-dvh items-center justify-center bg-ink px-4 py-16">
      <div className="absolute right-4 top-4">
        <ModeToggle />
      </div>
      <div className="w-full max-w-lg">
        <p className="mb-8 flex items-center justify-center gap-2.5 font-display text-3xl tracking-tight text-paper">
          <ThreadMark size={32} />
          dhaga
        </p>
        <div className="rounded-2xl border border-seam bg-panel p-6 sm:p-8">
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-ember">
            Waiting list
          </p>
          <h1 className="mt-3 font-display text-2xl text-paper">
            You&rsquo;re on the list, {user.name || user.email}.
          </h1>
          <p className="mt-3 text-sm leading-6 text-fog">
            Your account exists and is ready — it just needs to be let in. We
            approve new accounts in the order they arrive, and you&rsquo;ll get
            an email the moment yours is.
          </p>

          {summary ? (
            <div className="mt-8 border-t border-seam pt-6">
              <h2 className="font-display text-lg text-paper">Skip the queue</h2>
              <p className="mt-2 text-sm leading-6 text-fog">
                Paying puts you straight in — no waiting. Access is granted the
                moment the payment completes, not when you start checkout, so
                finish the payment and this page will let you through. Nothing
                is charged until you do.
              </p>
              <PendingCheckout summary={summary} preferred={preferred} founding={founding} />
              <p className="mt-4 text-xs text-fog">
                Already paid? It can take a few seconds for the payment to be
                confirmed —{" "}
                <Link href="/pending" className="text-ember hover:underline">
                  reload this page
                </Link>
                .
              </p>
            </div>
          ) : null}

          <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-seam pt-6">
            <p className="text-xs text-fog">
              Dhaga is open source — you can{" "}
              <Link href="/docs/self-hosting" className="text-ember hover:underline">
                self-host it today
              </Link>{" "}
              with no waiting list at all.
            </p>
            <SignOutButton />
          </div>
        </div>
      </div>
    </main>
  );
}
