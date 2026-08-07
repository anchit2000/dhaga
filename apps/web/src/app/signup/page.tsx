import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/guard";
import { enabledSocialProviders } from "@/lib/auth/config/social";
import { SignupForm } from "@/components/app/SignupForm";
import { ModeToggle } from "@/components/brand/ModeToggle";
import { ThreadMark } from "@/components/brand/ThreadMark";
import { publicPageMetadata } from "@/utils/public-page-metadata";

export const metadata = publicPageMetadata("signup");

interface SignupPageProps {
  searchParams: Promise<{ email?: string }>;
}

export default async function SignupPage({ searchParams }: SignupPageProps) {
  if (await getCurrentUser()) redirect("/app");
  const { email } = await searchParams;

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
          <h1 className="mb-1 font-display text-xl text-paper">Create your account</h1>
          <p className="mb-6 text-sm text-fog">
            Your professional memory, augmented — and yours alone.
          </p>
          <SignupForm socialProviders={enabledSocialProviders()} defaultEmail={email} />
          <p className="mt-6 text-center text-sm text-fog">
            Already have an account?{" "}
            <Link href="/login" className="text-ember hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
