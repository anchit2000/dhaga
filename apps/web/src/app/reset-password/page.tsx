import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/guard";
import { ResetPasswordForm } from "@/components/app/auth/ResetPasswordForm";
import { ThreadMark } from "@/components/brand/ThreadMark";

export const metadata = { title: "Choose a new password — Dhaga" };

interface ResetPasswordPageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  if (await getCurrentUser()) redirect("/app/people");
  const { token } = await searchParams;

  return (
    <main className="flex min-h-dvh items-center justify-center bg-ink px-4">
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
