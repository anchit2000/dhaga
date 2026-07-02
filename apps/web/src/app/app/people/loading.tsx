import { ListSkeleton, PageHeaderSkeleton } from "@/components/app/skeletons";

export default function PeopleLoading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <ListSkeleton />
    </div>
  );
}
