import { dashboardContent } from "@/lib/config";
import { formatDate, formatDateTime } from "@/lib/format";
import type { MessageRow } from "@/lib/data/dashboard";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MessageActions } from "@/components/dashboard/message-actions";

export function TableMessages({ messages }: { messages: MessageRow[] }) {
  const content = dashboardContent.messagesTable;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="hidden sm:table-cell">{content.columns.createdAt}</TableHead>
          <TableHead>{content.columns.description}</TableHead>
          <TableHead>{content.columns.position}</TableHead>
          <TableHead className="text-right">{content.columns.actions}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {messages.length === 0 ? (
          <TableRow>
            <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
              {content.empty}
            </TableCell>
          </TableRow>
        ) : (
          messages.map((message) => (
            <TableRow key={message.id}>
              <TableCell className="hidden sm:table-cell">
                {formatDate(message.created_at)}
              </TableCell>
              <TableCell className="max-w-48 truncate font-medium md:max-w-md">
                {message.description}
              </TableCell>
              <TableCell>{message.recipient_position}</TableCell>
              <TableCell className="text-right">
                <MessageActions
                  id={message.id}
                  description={message.description}
                  content={message.content}
                  position={message.recipient_position}
                  createdLabel={formatDateTime(message.created_at)}
                />
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
