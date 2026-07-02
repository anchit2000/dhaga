import { redirect } from "next/navigation";
import { hasSession } from "@/lib/auth/guard";
import { LoginForm } from "@/components/app/LoginForm";

export const metadata = { title: "Sign in — Dhaga" };

export default async function LoginPage() {
  if (await hasSession()) redirect("/app/people");

  return (
    <main className="flex min-h-dvh items-center justify-center bg-ink px-4">
      <div className="w-full max-w-sm">
        <p className="mb-8 text-center font-display text-3xl tracking-tight text-paper">
          dhaga
        </p>
        <div className="rounded-2xl border border-seam bg-panel p-6">
          <h1 className="mb-1 font-display text-xl text-paper">Sign in</h1>
          <p className="mb-6 text-sm text-fog">
            Your graph is yours — this instance is password-protected.
          </p>
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
