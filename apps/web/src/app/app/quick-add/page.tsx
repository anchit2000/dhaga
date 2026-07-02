import { requireSessionPage } from "@/lib/auth/guard";
import { EmptyState } from "@/components/app/EmptyState";

export const metadata = { title: "Quick add — Dhaga" };

export default async function QuickAddPage() {
  await requireSessionPage();

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl tracking-tight">Quick add</h1>
      <EmptyState
        title="Being built"
        body="Paste an email signature or card text → extracted contact, ready to review. Next increment."
      />
    </div>
  );
}
