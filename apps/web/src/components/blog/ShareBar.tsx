"use client";

import { useState } from "react";
import { Check, Link2 } from "lucide-react";
import {
  TwitterShareButton,
  LinkedinShareButton,
  WhatsappShareButton,
  EmailShareButton,
  XIcon,
  LinkedinIcon,
  WhatsappIcon,
  EmailIcon,
} from "react-share";
import type { ReactElement } from "react";

interface ShareBarProps {
  url: string;
  title: string;
}

// Bottom-of-post share row. All buttons are stateless URL shares (react-share);
// only "copy link" touches the clipboard.
export function ShareBar({ url, title }: ShareBarProps): ReactElement {
  const [copied, setCopied] = useState(false);

  async function copyLink(): Promise<void> {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable — no-op */
    }
  }

  return (
    <div className="mt-12 flex flex-wrap items-center gap-3 border-t border-seam pt-6">
      <span className="font-mono text-xs uppercase tracking-widest text-fog">
        Share
      </span>
      <TwitterShareButton url={url} title={title}>
        <XIcon size={32} round />
      </TwitterShareButton>
      <LinkedinShareButton url={url} title={title}>
        <LinkedinIcon size={32} round />
      </LinkedinShareButton>
      <WhatsappShareButton url={url} title={title}>
        <WhatsappIcon size={32} round />
      </WhatsappShareButton>
      <EmailShareButton url={url} subject={title} body={`${title}\n\n`}>
        <EmailIcon size={32} round />
      </EmailShareButton>
      <button
        type="button"
        onClick={copyLink}
        aria-label="Copy link"
        className="ml-auto inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-seam px-4 py-2 text-sm text-fog transition hover:text-paper"
      >
        {copied ? (
          <Check className="size-4 text-amber" />
        ) : (
          <Link2 className="size-4" />
        )}
        {copied ? "Copied" : "Copy link"}
      </button>
    </div>
  );
}
