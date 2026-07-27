"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormError } from "@/components/app/feedback";
import { createCompanyAction, renameCompanyAction } from "@/lib/actions/companies";

/** The fields the rename path prefills; `null` puts the dialog in create mode. */
export interface CompanyFormValues {
  id: string;
  name: string;
  domain: string | null;
  sector: string | null;
}

/**
 * One dialog reused for both create (company = null) and rename (prefilled).
 * The body is only mounted while open, so it reads fresh prop values into local
 * state on every open — no reset effect. Name is required; domain and sector
 * are optional. Success closes, refreshes the route, and toasts.
 */
export function CompanyFormDialog({
  company,
  open,
  onOpenChange,
}: {
  company: CompanyFormValues | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {open ? <CompanyFormBody company={company} onClose={() => onOpenChange(false)} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function CompanyFormBody({
  company,
  onClose,
}: {
  company: CompanyFormValues | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const isRename = company !== null;
  const [name, setName] = useState(company?.name ?? "");
  const [domain, setDomain] = useState(company?.domain ?? "");
  const [sector, setSector] = useState(company?.sector ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(): void {
    const trimmed = name.trim();
    if (!trimmed) return;
    setError(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("name", trimmed);
      formData.set("domain", domain.trim());
      formData.set("sector", sector.trim());
      if (company) formData.set("id", company.id);
      const result = company
        ? await renameCompanyAction(formData)
        : await createCompanyAction(formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onClose();
      router.refresh();
      toast.success(isRename ? "Company updated." : "Company created.");
    });
  }

  return (
    <>
      <DialogTitle>{isRename ? "Edit company" : "New company"}</DialogTitle>
      <DialogDescription>
        {isRename ? "Update this company's details." : "Add a company to your graph."}
      </DialogDescription>
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="company-name" className="text-fog">Name</Label>
          <Input id="company-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Acme Inc." autoFocus />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="company-domain" className="text-fog">Domain</Label>
          <Input id="company-domain" value={domain} onChange={(event) => setDomain(event.target.value)} placeholder="acme.com" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="company-sector" className="text-fog">Sector</Label>
          <Input id="company-sector" value={sector} onChange={(event) => setSector(event.target.value)} placeholder="Software" />
        </div>
        <FormError message={error} />
      </div>
      <DialogFooter>
        <Button loading={pending} disabled={!name.trim()} onClick={submit}>
          {isRename ? "Save changes" : "Create company"}
        </Button>
      </DialogFooter>
    </>
  );
}
