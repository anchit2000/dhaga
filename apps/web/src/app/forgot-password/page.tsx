import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/guard";
import { ForgotPasswordForm } from "@/components/app/auth/ForgotPasswordForm";
import { ThreadMark } from "@/components/brand/ThreadMark";

export const metadata = { title: "Reset your password — Dhaga" };

export default async function ForgotPasswordPage() {
  if (await getCurrentUser()) redirect("/app");

  return (
    <main className="flex min-h-dvh items-center justify-center bg-ink px-4">
      <div className="w-full max-w-sm">
        <p className="mb-8 flex items-center justify-center gap-2.5 font-display text-3xl tracking-tight text-paper">
          <ThreadMark size={32} />
          dhaga
        </p>
        <div className="rounded-2xl border border-seam bg-panel p-6">
          <h1 className="mb-1 font-display text-xl text-paper">Reset your password</h1>
          <p className="mb-6 text-sm text-fog">
            We&apos;ll email you a link to choose a new one.
          </p>
          <ForgotPasswordForm />
          <p className="mt-6 text-center text-sm text-fog">
            <Link href="/login" className="text-amber hover:underline">
              Back to sign in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
