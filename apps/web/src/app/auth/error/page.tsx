import Link from "next/link";
import { ThreadMark } from "@/components/brand/ThreadMark";

interface AuthErrorPageProps {
  searchParams: Promise<{ error?: string }>;
}

const ACCESS_REQUEST_ERRORS = new Set(["unable_to_create_user", "signup_disabled"]);

export default async function AuthErrorPage({ searchParams }: AuthErrorPageProps) {
  const { error } = await searchParams;
  const accessRequested = error ? ACCESS_REQUEST_ERRORS.has(error.toLowerCase()) : false;

  return (
    <main className="flex min-h-dvh items-center justify-center bg-ink px-4">
      <div className="w-full max-w-sm rounded-2xl border border-seam bg-panel p-6 text-center">
        <p className="mb-6 flex items-center justify-center gap-2.5 font-display text-3xl tracking-tight text-paper">
          <ThreadMark size={32} />
          dhaga
        </p>
        <h1 className="font-display text-xl text-paper">
          {accessRequested ? "Your access request is in" : "We couldn't finish signing you in"}
        </h1>
        <p className="mt-3 text-sm text-fog">
          {accessRequested
            ? "No account was created. We'll email you after an admin approves your address, then you can finish signing up."
            : "The sign-in attempt was cancelled or expired. Please return to sign in and try again."}
        </p>
        <Link
          href={accessRequested ? "/" : "/login"}
          className="mt-6 inline-block text-sm text-amber hover:underline"
        >
          {accessRequested ? "Back to Dhaga" : "Back to sign in"}
        </Link>
      </div>
    </main>
  );
}
