"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function RequestAccessForm() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = new FormData(event.currentTarget).get("email");
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/access-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        setError(body.error ?? "Something went wrong — try again.");
        return;
      }
      setSubmitted(true);
    } catch {
      setError("Network error — try again.");
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <p role="status" className="mt-8 text-amber">
        Request received — we&apos;ll email you when you&apos;re approved.
        Founding-price seats are assigned in request order.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 flex max-w-md flex-wrap gap-3">
      <Input
        type="email"
        name="email"
        required
        placeholder="you@company.com"
        aria-label="Email address"
        className="h-12 min-w-60 flex-1 border-seam bg-ink text-base placeholder:text-fog/50"
      />
      <Button type="submit" size="lg" disabled={loading}>
        {loading ? "Requesting…" : "Request access"}
      </Button>
      {error ? (
        <p role="alert" className="w-full text-sm text-red-400">
          {error}
        </p>
      ) : null}
    </form>
  );
}
