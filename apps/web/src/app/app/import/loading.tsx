import { Skeleton } from "@/components/ui/skeleton";

export default function ImportLoading() {
  return (
    <div className="space-y-10">
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-7 w-28" />
          <Skeleton className="h-4 w-full max-w-2xl" />
        </div>
        <Skeleton className="h-44 w-full rounded-2xl" />
      </div>
      <div className="space-y-4">
        <Skeleton className="h-6 w-44" />
        <Skeleton className="h-28 w-full rounded-2xl" />
      </div>
    </div>
  );
}
