"use client";

import Link from "next/link";
import { MoreHorizontal, Pencil, Tags, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/** Per-row overflow menu: Rename (which also holds the alias editor) opens the
 *  form dialog, Manage aliases jumps to the global list, Delete the confirm. */
export function CompanyRowActions({
  name,
  onRename,
  onDelete,
}: {
  name: string;
  onRename: () => void;
  onDelete: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" className="text-fog hover:text-paper" />}>
        <MoreHorizontal />
        <span className="sr-only">Actions for {name}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onRename}>
          <Pencil />
          Rename
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link href="/app/companies/aliases" />}>
          <Tags />
          Manage aliases
        </DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onClick={onDelete}>
          <Trash2 />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
