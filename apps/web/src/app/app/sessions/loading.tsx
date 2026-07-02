import { ListSkeleton, PageHeaderSkeleton } from "@/components/app/skeletons";

export default function SessionsLoading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <ListSkeleton rows={4} />
    </div>
  );
}
