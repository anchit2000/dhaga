/** Small amber count pill for a nav item (pending confirmations). Hidden at
 *  zero so the nav stays quiet when there's nothing to act on. */
export function NavBadge({ count }: { count: number }): React.ReactElement | null {
  if (count <= 0) return null;
  return (
    <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-amber/20 px-1 font-mono text-[10px] font-medium text-ember">
      {count > 99 ? "99+" : count}
    </span>
  );
}
