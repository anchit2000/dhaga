"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function WaitlistForm() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    // TODO(waitlist): POST to /api/waitlist once the backend route exists.
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
    }, 400);
  }

  if (submitted) {
    return (
      <p role="status" className="mt-8 text-amber">
        You&apos;re on the list. First invites go out before autumn conference
        season — founding seats are assigned in signup order.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 flex max-w-md flex-wrap gap-3">
      <Input
        type="email"
        required
        placeholder="you@company.com"
        aria-label="Email address"
        className="h-12 min-w-60 flex-1 border-seam bg-ink text-base placeholder:text-fog/50"
      />
      <Button type="submit" size="lg" disabled={loading}>
        {loading ? "Reserving…" : "Request an invite"}
      </Button>
    </form>
  );
}
