"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

/** Form submit with the mandatory in-flight state (disabled + spinner).
 *  `disabled` is for a submit that cannot succeed yet (e.g. an AI action with no
 *  credits left) — always pair it with a visible reason next to the button. */
export function SubmitButton({
  children,
  className,
  disabled,
}: {
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending} disabled={disabled} className={className}>
      {children}
    </Button>
  );
}
