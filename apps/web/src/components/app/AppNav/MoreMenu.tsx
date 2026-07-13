"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Ellipsis } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { APP_MORE_LINKS } from "@/utils/constants/app";
import { isNavLinkActive } from "./link-state";

/** Secondary nav destinations (People, Events, Quick add) — kept out of ProfileMenu, which is account-only. */
export function MoreMenu() {
  const pathname = usePathname();
  const active = APP_MORE_LINKS.some((link) => isNavLinkActive(link.href, pathname));

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className={cn("rounded-full", active ? "text-amber" : "text-fog hover:text-paper")}
          />
        }
      >
        <Ellipsis className="size-5" />
        <span className="sr-only">More</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {APP_MORE_LINKS.map((link) => {
          const Icon = link.icon;
          return (
            <DropdownMenuItem key={link.href} render={<Link href={link.href} />}>
              <Icon className="size-4" />
              {link.label}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
