import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import type { Case } from "@/lib/api";
import { URGENCY_COLORS, STATUS_COLORS } from "@/lib/theme";

export function CaseTable({
  cases,
  onCaseClick,
}: {
  cases: Case[];
  onCaseClick?: (c: Case) => void;
}) {
  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16">ID</TableHead>
            <TableHead>Urgency</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Lang</TableHead>
            <TableHead className="text-right">Created</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {cases.map((c) => (
            <TableRow
              key={c.id}
              className={onCaseClick ? "cursor-pointer hover:bg-gray-50" : ""}
              onClick={() => onCaseClick?.(c)}
            >
              <TableCell className="font-mono text-xs">{c.id}</TableCell>
              <TableCell>
                <Badge className={URGENCY_COLORS[c.urgency]}>{c.urgency}</Badge>
              </TableCell>
              <TableCell className="text-sm">{c.possible_category || "—"}</TableCell>
              <TableCell>
                <Badge variant="outline" className={STATUS_COLORS[c.status]}>{c.status}</Badge>
              </TableCell>
              <TableCell className="text-xs font-mono">{c.language.toUpperCase()}</TableCell>
              <TableCell className="text-xs text-right text-gray-400">
                {new Date(c.created_at).toLocaleDateString("en-IN")}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
