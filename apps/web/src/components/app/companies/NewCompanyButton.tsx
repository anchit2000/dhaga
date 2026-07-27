"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CompanyFormDialog } from "@/components/app/companies/CompanyFormDialog";

/** Header affordance that opens the create-company dialog. */
export function NewCompanyButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus /> New company
      </Button>
      <CompanyFormDialog company={null} open={open} onOpenChange={setOpen} />
    </>
  );
}
