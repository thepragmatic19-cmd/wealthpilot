import { Skeleton } from "@/components/ui/skeleton";

export default function ChatLoading() {
  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col gap-4">
      <div className="space-y-1">
        <Skeleton className="h-7 w-36" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="flex-1 rounded-xl border">
        <div className="flex flex-col gap-4 p-4">
          <div className="flex justify-end">
            <Skeleton className="h-12 w-48 rounded-xl" />
          </div>
          <div className="flex justify-start">
            <Skeleton className="h-20 w-72 rounded-xl" />
          </div>
          <div className="flex justify-end">
            <Skeleton className="h-12 w-56 rounded-xl" />
          </div>
          <div className="flex justify-start">
            <Skeleton className="h-28 w-80 rounded-xl" />
          </div>
        </div>
      </div>
      <Skeleton className="h-14 w-full rounded-xl" />
    </div>
  );
}
