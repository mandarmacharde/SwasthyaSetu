const COL_MAPS: Record<number, string> = { 2: "sm:grid-cols-2", 3: "sm:grid-cols-3", 4: "sm:grid-cols-4" };

export function SkeletonDashboard({ cols = 3 }: { cols?: number }) {
  return (
    <div className="space-y-3 animate-pulse">
      <div className={`grid grid-cols-1 ${COL_MAPS[cols] || "sm:grid-cols-3"} gap-4 mb-6`}>
        {Array.from({ length: cols }, (_, i) => (
          <div key={i} className="h-24 bg-gray-200 rounded-lg" />
        ))}
      </div>
      <div className="h-64 bg-gray-100 rounded-lg" />
    </div>
  );
}
