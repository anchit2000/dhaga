/**
 * The Dhaga brand mark: a thread tied in a single loose knot between two
 * people (nodes). Deliberately distinct from coil/spiral marks used
 * elsewhere in the category. Keep this the single source of the mark —
 * icon.svg / logo.svg / OG image are generated from the same geometry
 * (scripts/generate-brand-assets.mjs).
 */
export function ThreadMark({ size = 24 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={(size * 20) / 24}
      viewBox="0 0 24 20"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M2 16 C 7 16, 8 6, 13 6 C 17 6, 17 11, 13.5 11 C 10 11, 10 6.5, 14.5 5 C 18 3.8, 20 4.5, 22 4"
        stroke="#e2a44c"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <circle cx="2" cy="16" r="2" fill="#f3ede2" />
      <circle cx="22" cy="4" r="2" fill="#f3ede2" />
    </svg>
  );
}
