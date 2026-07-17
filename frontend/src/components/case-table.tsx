import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Case } from "@/lib/api";
import { URGENCY_BG } from "@/lib/theme";

export function CaseTable({ cases }: { cases: Case[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>ID</TableHead>
          <TableHead>Urgency</TableHead>
          <TableHead>Category</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Language</TableHead>
          <TableHead>Created</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {cases.map((c) => (
          <TableRow key={c.id}>
            <TableCell className="font-mono text-xs">#{c.id}</TableCell>
            <TableCell>
              <Badge className={URGENCY_BG[c.urgency]}>
                {c.urgency.toUpperCase()}
              </Badge>
            </TableCell>
            <TableCell>{c.possible_category || "—"}</TableCell>
            <TableCell>
              <Badge variant="outline">{c.status}</Badge>
            </TableCell>
            <TableCell>{c.language.toUpperCase()}</TableCell>
            <TableCell className="text-xs text-gray-400">
              {new Date(c.created_at).toLocaleDateString("en-IN")}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
