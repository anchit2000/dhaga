import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/guard";
import { ResetPasswordForm } from "@/components/app/auth/ResetPasswordForm";
import { ModeToggle } from "@/components/brand/ModeToggle";
import { ThreadMark } from "@/components/brand/ThreadMark";

export const metadata = { title: "Choose a new password — Dhaga" };

interface ResetPasswordPageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const { token } = await searchParams;
  // A valid reset token proves email ownership independently of any active
  // session — a user may follow the link while still logged in (or on a shared
  // browser), and completing the reset revokes their sessions anyway
  // (revokeSessionsOnPasswordReset). Only bounce logged-in users away when
  // there's no token to act on; with a token, always render the form.
  if (!token && (await getCurrentUser())) redirect("/app");

  return (
    <main className="relative flex min-h-dvh items-center justify-center bg-ink px-4">
      <div className="absolute right-4 top-4">
        <ModeToggle />
      </div>
      <div className="w-full max-w-sm">
        <p className="mb-8 flex items-center justify-center gap-2.5 font-display text-3xl tracking-tight text-paper">
          <ThreadMark size={32} />
          dhaga
        </p>
        <div className="rounded-2xl border border-seam bg-panel p-6">
          <h1 className="mb-1 font-display text-xl text-paper">Choose a new password</h1>
          {token ? (
            <ResetPasswordForm token={token} />
          ) : (
            <p className="text-sm text-red-400">
              This reset link is missing its token. Request a new one from the sign-in page.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
