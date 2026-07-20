import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/brand/ModeToggle";
import { ThreadMark } from "@/components/brand/ThreadMark";

const NAV_LINKS = [
  { href: "#product", label: "Product" },
  { href: "#compare", label: "Compare" },
  { href: "#opensource", label: "Open source" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
  { href: "/docs", label: "Docs" },
];

interface HeaderProps {
  isSignedIn: boolean;
}

export function Header({ isSignedIn }: HeaderProps) {
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
        <div className="flex items-center gap-2 sm:gap-4">
          <ModeToggle />
          {isSignedIn ? (
            <Button render={<Link href="/app" />} size="sm">
              Dashboard
            </Button>
          ) : (
            <>
              <Link
                href="/login"
                className="hidden text-sm text-fog transition-colors hover:text-paper sm:inline"
              >
                Sign in
              </Link>
              <Button render={<Link href="#request-access" />} size="sm">
                Request access
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
