import { dashboardContent } from "@/lib/config";
import { formatDate } from "@/lib/format";
import type { WorkerRow } from "@/lib/data/dashboard";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { WorkerActions } from "@/components/dashboard/worker-actions";

export function TableWorkers({ workers }: { workers: WorkerRow[] }) {
  const content = dashboardContent.workersTable;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{content.columns.name}</TableHead>
          <TableHead>{content.columns.position}</TableHead>
          <TableHead className="hidden md:table-cell">{content.columns.createdAt}</TableHead>
          <TableHead className="hidden sm:table-cell">{content.columns.role}</TableHead>
          <TableHead className="text-right">{content.columns.actions}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {workers.length === 0 ? (
          <TableRow>
            <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
              {content.empty}
            </TableCell>
          </TableRow>
        ) : (
          workers.map((worker) => (
            <TableRow key={worker.id}>
              <TableCell className="font-medium">{worker.name}</TableCell>
              <TableCell>{worker.position ?? content.noPosition}</TableCell>
              <TableCell className="hidden md:table-cell">
                {formatDate(worker.created_at)}
              </TableCell>
              <TableCell className="hidden sm:table-cell">
                <Badge variant={worker.role === "admin" ? "default" : "secondary"}>
                  {content.roleLabels[worker.role]}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                {/* Admin rows are read-only: no edit, no delete. */}
                {worker.role === "worker" && (
                  <WorkerActions
                    userId={worker.user_id}
                    name={worker.name}
                    position={worker.position}
                  />
                )}
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
