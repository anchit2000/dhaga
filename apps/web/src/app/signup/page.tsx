import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/guard";
import { SignupForm } from "@/components/app/SignupForm";
import { ThreadMark } from "@/components/brand/ThreadMark";

export const metadata = { title: "Create account — Dhaga" };

export default async function SignupPage() {
  if (await getCurrentUser()) redirect("/app/people");

  return (
    <main className="flex min-h-dvh items-center justify-center bg-ink px-4">
      <div className="w-full max-w-sm">
        <p className="mb-8 flex items-center justify-center gap-2.5 font-display text-3xl tracking-tight text-paper">
          <ThreadMark size={32} />
          dhaga
        </p>
        <div className="rounded-2xl border border-seam bg-panel p-6">
          <h1 className="mb-1 font-display text-xl text-paper">Create your account</h1>
          <p className="mb-6 text-sm text-fog">
            Your professional memory, augmented — and yours alone.
          </p>
          <SignupForm />
          <p className="mt-6 text-center text-sm text-fog">
            Already have an account?{" "}
            <Link href="/login" className="text-amber hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
