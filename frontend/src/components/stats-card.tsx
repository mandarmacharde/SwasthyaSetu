import { Card, CardContent } from "@/components/ui/card";

export function StatsCard({
  title,
  value,
  subtitle,
  icon,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: string;
}) {
  return (
    <Card>
      <CardContent className="p-4 flex items-start gap-4">
        <span className="text-2xl">{icon}</span>
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">{title}</p>
          <p className="text-2xl font-bold mt-0.5">{value}</p>
          {subtitle && (
            <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
