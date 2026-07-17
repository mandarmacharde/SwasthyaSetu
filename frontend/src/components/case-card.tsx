import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { Case } from "@/lib/api";
import { URGENCY_COLORS, STATUS_COLORS } from "@/lib/theme";

export function CaseCard({
  case: c,
  onAssign,
}: {
  case: Case;
  onAssign?: () => void;
}) {
  const summary = c.triage_summary ? JSON.parse(c.triage_summary) : null;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge className={URGENCY_COLORS[c.urgency]}>
                {c.urgency.toUpperCase()}
              </Badge>
              <Badge variant="outline" className={STATUS_COLORS[c.status]}>
                {c.status}
              </Badge>
            </div>
            <p className="text-sm font-medium">{c.possible_category || "Unclassified"}</p>
          </div>
          <span className="text-xs text-gray-400">
            {new Date(c.created_at).toLocaleString("en-IN")}
          </span>
        </div>

        {summary && (
          <div className="text-xs text-gray-600 space-y-1 mb-3">
            {summary.next_question && (
              <p className="italic">❓ {summary.next_question}</p>
            )}
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>#{c.id}</span>
          <span>🌐 {c.language.toUpperCase()}</span>
          {c.callback_number && <span>📞 {c.callback_number}</span>}
        </div>
      </CardContent>
    </Card>
  );
}
