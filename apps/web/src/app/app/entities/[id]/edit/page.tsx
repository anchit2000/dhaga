import { notFound } from "next/navigation";
import { requireUserIdForPage } from "@/lib/auth/guard";
import { getCachedNodeTypes } from "@/lib/cache/node-types";
import { getEntity } from "@/lib/repo/entities";
import { EntityForm } from "@/components/app/entities/EntityForm";

export const metadata = { title: "Edit entity — Dhaga" };

export default async function EditEntityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const userId = await requireUserIdForPage();
  const { id } = await params;
  const [entity, types] = await Promise.all([getEntity(id), getCachedNodeTypes(userId)]);
  if (!entity) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-2xl tracking-tight">Edit entity</h1>
        <p className="mt-1 text-sm text-fog">Rename, retype, or refine the description.</p>
      </div>
      <div className="rounded-2xl border border-seam bg-panel p-5 sm:p-6">
        <EntityForm
          entityId={id}
          initial={{ name: entity.name, typeId: entity.typeId, description: entity.description }}
          types={types.map((type) => ({ id: type.id, name: type.name, color: type.color }))}
        />
      </div>
    </div>
  );
}
