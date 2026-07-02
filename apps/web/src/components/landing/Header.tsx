import Link from "next/link";
import { Button } from "@/components/ui/button";

const NAV_LINKS = [
  { href: "#product", label: "Product" },
  { href: "#compare", label: "Compare" },
  { href: "#opensource", label: "Open source" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
];

export function Header() {
  return (
    <header className="fixed inset-x-0 top-0 z-40 bg-gradient-to-b from-ink via-ink/80 to-transparent">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="#" className="flex items-center gap-2 font-display text-xl">
          <ThreadMark />
          <span>
            dhaga<span className="text-amber">.</span>
          </span>
        </Link>
        <nav className="hidden items-center gap-1 rounded-full border border-seam bg-panel/80 px-2 py-1 backdrop-blur md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-full px-4 py-1.5 text-sm text-fog transition-colors hover:text-paper"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <Button render={<Link href="#waitlist" />} size="sm">
          Join the waitlist
        </Button>
      </div>
    </header>
  );
}

/**
 * Brand mark: a thread tied in a single loose knot between two people (nodes).
 * Deliberately distinct from coil/spiral marks used elsewhere in the category.
 */
function ThreadMark() {
  return (
    <svg width="24" height="20" viewBox="0 0 24 20" fill="none" aria-hidden="true">
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
