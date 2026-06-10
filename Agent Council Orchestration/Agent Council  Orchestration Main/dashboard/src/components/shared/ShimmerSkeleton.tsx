import { cn } from "@/lib/utils";

export default function ShimmerSkeleton({ className }: { className?: string }) {
  return <div className={cn("shimmer rounded-md", className)} />;
}
