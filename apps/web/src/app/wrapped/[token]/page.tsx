import Link from "next/link";
import { ShareBar } from "@/components/blog/ShareBar";
import { Button } from "@/components/ui/button";
import { SITE_URL } from "@/utils/constants/site";
import { WRAPPED_SHARE_PATH } from "@/utils/constants/wrapped";
import { decodeWrappedToken } from "@/lib/wrapped/sign";
import { buildWrappedOgUrl } from "@/lib/wrapped/og-url";
import type { Metadata } from "next";
import type { ReactElement } from "react";

// Public, no-auth, CONTACT-FREE share/preview page. The card is decoded from a
// self-contained HMAC token, so viewing it needs no session and it can never
// carry a contact's name (only counts + scope label + cluster category).
interface Props {
  params: Promise<{ token: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  const url = `${SITE_URL}${WRAPPED_SHARE_PATH}/${token}`;
  const decoded = decodeWrappedToken(token);
  if (!decoded) {
    return {
      title: "Network Wrapped — Dhaga",
      description: "Your networking, in review.",
      alternates: { canonical: url },
    };
  }
  const { params: p } = decoded;
  const ogImage = buildWrappedOgUrl(p, token.split(".")[1] ?? "", "landscape");
  const title = `${p.scopeLabel} — ${p.newPeople} new connections`;
  const description = `${p.newPeople} people met · ${p.totalNetwork} in network. Made with Dhaga, the AI personal CRM.`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { type: "website", url, title, description, siteName: "Dhaga", images: [ogImage] },
    twitter: { card: "summary_large_image", title, description, images: [ogImage] },
  };
}

export default async function WrappedSharePage({ params }: Props): Promise<ReactElement> {
  const { token } = await params;
  const decoded = decodeWrappedToken(token);
  const url = `${SITE_URL}${WRAPPED_SHARE_PATH}/${token}`;

  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-2xl flex-col items-center gap-8 px-4 py-16 sm:py-24">
      {decoded ? (
        <>
          <p className="font-mono text-[11px] uppercase tracking-widest text-ember">
            dhaga · network wrapped
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element -- same-origin dynamic OG image, not an optimizable static asset */}
          <img
            src={buildWrappedOgUrl(decoded.params, token.split(".")[1] ?? "", "landscape")}
            alt={`${decoded.params.scopeLabel} — ${decoded.params.newPeople} new connections`}
            width={1200}
            height={630}
            className="w-full rounded-xl border border-seam"
          />
          <ShareBar url={url} title={`${decoded.params.scopeLabel} — Network Wrapped`} />
        </>
      ) : (
        <div className="flex flex-col items-center gap-3 text-center">
          <p className="font-mono text-[11px] uppercase tracking-widest text-ember">
            dhaga · network wrapped
          </p>
          <h1 className="font-display text-2xl text-paper">This card link is invalid or expired</h1>
          <p className="max-w-sm text-sm text-fog">
            The link may be incomplete. You can still make your own networking recap in seconds.
          </p>
        </div>
      )}

      <div className="flex flex-col items-center gap-3 border-t border-seam pt-8 text-center">
        <p className="text-sm text-fog">Turn every conversation into a network you can act on.</p>
        <Button render={<Link href="/" />} size="lg">
          Make your own on Dhaga
        </Button>
      </div>
    </main>
  );
}
