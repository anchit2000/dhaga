"use client";

import { useState, useSyncExternalStore } from "react";
import { Check, Download, Link2, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShareBar } from "@/components/blog/ShareBar";
import { WRAPPED_CARD_SIZES, WRAPPED_DEFAULT_FORMAT } from "@/utils/constants/wrapped";
import type { ReactElement } from "react";
import type { WrappedCardFormat } from "@dhaga/core/src/api/wrapped";

const FORMATS = Object.keys(WRAPPED_CARD_SIZES) as WrappedCardFormat[];
const FORMAT_LABELS: Record<WrappedCardFormat, string> = {
  landscape: "Post",
  square: "Square",
  story: "Story",
};

/**
 * Share sheet: pick an aspect ratio, then download the image, copy the public
 * link, hand off to the OS share sheet (with the image file when supported), or
 * post to a social network. Everything shared is contact-free by construction.
 */
export function ShareModal({
  shareUrl,
  ogUrls,
  title,
}: {
  shareUrl: string;
  ogUrls: Record<WrappedCardFormat, string>;
  title: string;
}): ReactElement {
  const [open, setOpen] = useState(false);
  const [format, setFormat] = useState<WrappedCardFormat>(WRAPPED_DEFAULT_FORMAT);
  const [copied, setCopied] = useState(false);
  // SSR-safe capability check: false on the server, real value after hydration,
  // without a setState-in-effect cascade.
  const canNativeShare = useSyncExternalStore(
    () => () => {},
    () => typeof navigator !== "undefined" && typeof navigator.share === "function",
    () => false,
  );

  async function copyLink(): Promise<void> {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable — no-op */
    }
  }

  async function shareNative(): Promise<void> {
    try {
      if (typeof navigator.canShare === "function") {
        const response = await fetch(ogUrls[format]);
        const blob = await response.blob();
        const file = new File([blob], `network-wrapped-${format}.png`, {
          type: blob.type || "image/png",
        });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title });
          return;
        }
      }
      await navigator.share({ url: shareUrl, title });
    } catch {
      /* cancelled or unsupported — no-op */
    }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} className="w-full">
        <Share2 />
        Share
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogTitle>Share your Wrapped</DialogTitle>
          <DialogDescription>Pick a format — the image is yours to post anywhere.</DialogDescription>

          <Tabs value={format} onValueChange={(value) => setFormat(value as WrappedCardFormat)}>
            <TabsList className="w-full">
              {FORMATS.map((option) => (
                <TabsTrigger key={option} value={option}>
                  {FORMAT_LABELS[option]}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          {/* eslint-disable-next-line @next/next/no-img-element -- same-origin dynamic OG image, not an optimizable static asset */}
          <img
            src={ogUrls[format]}
            alt={`Network Wrapped — ${FORMAT_LABELS[format]}`}
            className="mx-auto max-h-[46vh] w-auto max-w-full rounded-lg border border-seam bg-panel"
          />

          <div className="flex flex-wrap gap-2">
            <Button
              render={<a href={ogUrls[format]} download={`network-wrapped-${format}.png`} />}
              variant="outline"
              size="sm"
            >
              <Download />
              Download
            </Button>
            <Button onClick={copyLink} variant="outline" size="sm">
              {copied ? <Check className="text-ember" /> : <Link2 />}
              {copied ? "Copied" : "Copy link"}
            </Button>
            {canNativeShare ? (
              <Button onClick={shareNative} variant="outline" size="sm">
                <Share2 />
                Share…
              </Button>
            ) : null}
          </div>

          <ShareBar url={shareUrl} title={title} />
        </DialogContent>
      </Dialog>
    </>
  );
}
