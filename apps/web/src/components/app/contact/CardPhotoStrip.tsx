import type { CardImageRef } from "@/lib/repo/card-images";

/** Stored card photos — the visual receipts behind a scanned contact.
 *  Renders nothing when no photo was kept (storage off, or pasted text). */
export function CardPhotoStrip({ images }: { images: CardImageRef[] }) {
  if (images.length === 0) return null;
  return (
    <section className="space-y-3">
      <h2 className="font-display text-lg">Card photo</h2>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {images.map((image) => (
          <a
            key={image.id}
            href={`/api/card-image/${image.id}`}
            target="_blank"
            rel="noreferrer"
            className="shrink-0"
            title={`Scanned ${image.createdAt.toLocaleDateString()}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- auth-gated
                dynamic route; the Next image optimizer can't fetch it */}
            <img
              src={`/api/card-image/${image.id}`}
              alt="Scanned card — visual receipt"
              className="h-28 w-auto rounded-xl border border-seam transition-opacity hover:opacity-90"
            />
          </a>
        ))}
      </div>
    </section>
  );
}
