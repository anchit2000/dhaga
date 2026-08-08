import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * The single "get started" call to action for the marketing surfaces.
 *
 * Replaces the old RequestAccessForm: signup is open now, so there is nothing
 * to request — you create the account, and a hosted account waits on /pending
 * only until an admin approves it or a payment lands. Saying "request access"
 * in front of a form that no longer gates anything would be the wrong promise.
 */
export function SignUpCta({ className }: { className?: string }): React.ReactElement {
  return (
    <div className={className ?? "mt-8 flex flex-wrap items-center gap-3"}>
      <Button render={<Link href="/signup" />} size="lg">
        Create your account
        <ArrowRight aria-hidden="true" />
      </Button>
      <Button render={<Link href="/pricing" />} variant="outline" size="lg">
        See pricing
      </Button>
    </div>
  );
}
