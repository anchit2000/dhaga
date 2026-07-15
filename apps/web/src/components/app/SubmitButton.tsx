"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

/** Form submit with the mandatory in-flight state (disabled + spinner). */
export function SubmitButton({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending} className={className}>
      {children}
    </Button>
  );
}
