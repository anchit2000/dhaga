import { formatDate } from "@/utils/format-date";
import type { CardImageRef } from "@/lib/repo/card-images";

/** Stored photos — the visual receipts behind a scanned card and behind any
 *  photo captured as a note. Renders nothing when no photo was kept (storage
 *  off, or a capture that had no photo at all). */
export function CardPhotoStrip({ images }: { images: CardImageRef[] }) {
  if (images.length === 0) return null;
  return (
    <section className="space-y-3">
      <h2 className="font-display text-lg">Photos</h2>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {images.map((image) => (
          <a
            key={image.id}
            href={`/api/card-image/${image.id}`}
            target="_blank"
            rel="noreferrer"
            className="shrink-0"
            title={`Captured ${formatDate(image.createdAt)}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- auth-gated
                dynamic route; the Next image optimizer can't fetch it */}
            <img
              src={`/api/card-image/${image.id}`}
              alt="Captured photo — visual receipt"
              className="h-28 w-auto rounded-xl border border-seam transition-opacity hover:opacity-90"
            />
          </a>
        ))}
      </div>
    </section>
  );
}
