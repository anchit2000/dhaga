import { requireSessionPage } from "@/lib/auth/guard";
import { EmptyState } from "@/components/app/EmptyState";

export const metadata = { title: "Sessions — Dhaga" };

export default async function SessionsPage() {
  await requireSessionPage();

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl tracking-tight">Sessions</h1>
      <EmptyState
        title="Being built"
        body="Encounter sessions — the people you met at one event, grouped. Next increment."
      />
    </div>
  );
}
