import Image from "next/image";
import { getPerson } from "@/utils/constants/landing/people";

/**
 * Photo headshot with the person's accent ring + soft glow.
 * Portraits live in public/avatars/ (copyright-free mockup portraits;
 * replace with licensed/model-released photos before paid marketing use).
 */
export function Headshot({
  personId,
  className = "size-9",
  glow = false,
}: {
  personId: string;
  className?: string;
  glow?: boolean;
}) {
  const person = getPerson(personId);
  return (
    <span
      className={`relative inline-block shrink-0 overflow-hidden rounded-full ${className}`}
      style={{
        boxShadow: glow
          ? `0 0 0 2px ${person.accent}, 0 0 24px ${person.accent}88`
          : `0 0 0 1.5px ${person.accent}aa`,
      }}
    >
      <Image
        src={`/avatars/${person.id}.jpg`}
        alt={person.name}
        fill
        sizes="96px"
        className="rounded-full object-cover"
      />
    </span>
  );
}
