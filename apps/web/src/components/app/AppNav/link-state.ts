/** Home matches only the exact path; every other link matches its whole subtree. */
export function isNavLinkActive(href: string, pathname: string): boolean {
  return href === "/app" ? pathname === "/app" : pathname.startsWith(href);
}

export function isNavLinkPending(href: string, pendingHref: string | undefined): boolean {
  return href === "/app" ? pendingHref === "/app" : (pendingHref?.startsWith(href) ?? false);
}
