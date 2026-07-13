"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CircleUserRound, Loader2, LogOut, Settings, ShieldCheck } from "lucide-react";
import { authClient } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/** Account-only menu: settings, admin, sign out. Nav destinations live in MoreMenu instead. */
export function ProfileMenu({ isAdmin }: { isAdmin: boolean }) {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full text-fog hover:text-paper"
          />
        }
      >
        <CircleUserRound className="size-5" />
        <span className="sr-only">Account menu</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem render={<Link href="/app/settings" />}>
          <Settings className="size-4" />
          Settings
        </DropdownMenuItem>
        {isAdmin && (
          <DropdownMenuItem render={<Link href="/app/admin" />}>
            <ShieldCheck className="size-4" />
            Admin
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={signingOut}
          onClick={() => {
            if (signingOut) return;
            setSigningOut(true);
            void authClient.signOut().then(({ error }) => {
              if (error) {
                setSigningOut(false);
                return;
              }
              router.replace("/login");
              router.refresh();
            });
          }}
        >
          {signingOut ? <Loader2 className="size-4 animate-spin" /> : <LogOut className="size-4" />}
          {signingOut ? "Signing out…" : "Sign out"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
