import { requireUserIdForPage } from "@/lib/auth/guard";
import { listNodeTypes } from "@/lib/repo/node-types";
import { EntityForm } from "@/components/app/entities/EntityForm";

export const metadata = { title: "New entity — Dhaga" };

export default async function NewEntityPage() {
  await requireUserIdForPage();
  const types = await listNodeTypes();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-2xl tracking-tight">New entity</h1>
        <p className="mt-1 text-sm text-fog">
          Gyms, schools, projects — anything in your life that connects people.
        </p>
      </div>
      <div className="rounded-2xl border border-seam bg-panel p-5 sm:p-6">
        <EntityForm
          types={types.map((type) => ({ id: type.id, name: type.name, color: type.color }))}
        />
      </div>
    </div>
  );
}
