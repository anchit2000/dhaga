import { requireSessionPage } from "@/lib/auth/guard";
import { EmptyState } from "@/components/app/EmptyState";

export const metadata = { title: "Search — Dhaga" };

export default async function SearchPage() {
  await requireSessionPage();

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl tracking-tight">Search</h1>
      <EmptyState
        title="Being built"
        body="Ask your network in plain language, get answers with receipts. Coming in a later increment."
      />
    </div>
  );
}
