import { LoadingCards } from "@/components/ui/EmptyState";

export default function Loading() {
  return (
    <div className="max-w-6xl mx-auto">
      <div className="h-7 w-48 rounded-sm animate-pulse mb-6" style={{ background: "rgba(20,33,61,0.10)" }} />
      <LoadingCards count={8} />
    </div>
  );
}
