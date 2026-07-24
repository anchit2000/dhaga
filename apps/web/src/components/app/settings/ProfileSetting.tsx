"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ProfileSettingProps {
  name: string;
  email: string;
}

/**
 * Your account identity. Name is editable through better-auth's updateUser —
 * a core capability that works the same in self-host and hosted mode. Email is
 * shown read-only: this instance doesn't enable better-auth's changeEmail flow,
 * so the sign-in address can't be swapped here.
 */
export function ProfileSetting({ name: initialName, email }: ProfileSettingProps) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [savedName, setSavedName] = useState(initialName);
  const [pending, setPending] = useState(false);

  const trimmed = name.trim();
  const dirty = trimmed.length > 0 && trimmed !== savedName;

  async function handleSave(): Promise<void> {
    if (!dirty || pending) return;
    setPending(true);
    const { error } = await authClient.updateUser({ name: trimmed });
    setPending(false);
    if (error) {
      toast.error(error.message ?? "Couldn't save your name.");
      return;
    }
    setSavedName(trimmed);
    setName(trimmed);
    toast.success("Profile updated.");
    router.refresh();
  }

  return (
    <div className="space-y-4 rounded-2xl border border-seam bg-panel p-5 sm:p-6">
      <div>
        <p className="text-sm font-medium text-paper">Profile</p>
        <p className="mt-1 text-sm text-fog">Your name and account email.</p>
      </div>
      <form
        className="space-y-1"
        onSubmit={(e) => {
          e.preventDefault();
          void handleSave();
        }}
      >
        <Label htmlFor="profile-name" className="text-fog">
          Name
        </Label>
        <div className="flex items-end gap-2">
          <Input
            id="profile-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            disabled={pending}
            className="h-10"
          />
          <Button type="submit" disabled={!dirty || pending}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            Save
          </Button>
        </div>
      </form>
      <div className="space-y-1">
        <Label htmlFor="profile-email" className="text-fog">
          Email
        </Label>
        <Input id="profile-email" type="email" value={email} readOnly disabled className="h-10" />
        <p className="text-xs text-fog">This is your sign-in email and can&apos;t be changed here.</p>
      </div>
    </div>
  );
}
