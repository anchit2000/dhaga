import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { NavBadge } from "./NavBadge";

/** One full-width row in MobileMenu's Sheet — shared shape for both the
 *  primary (APP_NAV_LINKS) and secondary (APP_MORE_LINKS) sections. */
export function MobileMenuLink({
  href,
  label,
  icon: Icon,
  active,
  badgeCount,
  onNavigate,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
  badgeCount?: number;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(
        "flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-base transition-colors",
        active ? "bg-amber/15 font-medium text-ember" : "text-fog hover:bg-amber/5 hover:text-paper",
      )}
    >
      <Icon className="size-5" />
      {label}
      {badgeCount !== undefined ? <NavBadge count={badgeCount} className="ml-auto" /> : null}
    </Link>
  );
}
