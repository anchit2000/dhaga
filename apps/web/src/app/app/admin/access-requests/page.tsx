// Dhaga Cloud only — see packages/ee/LICENSE.
import { listAccessRequests } from "@dhaga/ee/access-requests";
import type { AccessRequestRow, AccessRequestStatus } from "@dhaga/ee/access-requests";
import {
  approveAccessRequestAction,
  rejectAccessRequestAction,
} from "@/lib/actions/admin/access-requests";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const STATUSES: AccessRequestStatus[] = ["pending", "approved", "rejected"];

export default async function AccessRequestsPage() {
  const [pending, approved, rejected] = await Promise.all(
    STATUSES.map((status) => listAccessRequests(status)),
  );
  const byStatus: Record<AccessRequestStatus, AccessRequestRow[]> = {
    pending,
    approved,
    rejected,
  };

  return (
    <div>
      <h1 className="font-display text-2xl tracking-tight">Access requests</h1>
      <Tabs defaultValue="pending" className="mt-6">
        <TabsList>
          {STATUSES.map((status) => (
            <TabsTrigger key={status} value={status}>
              {status} ({byStatus[status].length})
            </TabsTrigger>
          ))}
        </TabsList>
        {STATUSES.map((status) => (
          <TabsContent key={status} value={status}>
            <RequestsTable rows={byStatus[status]} showActions={status === "pending"} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function RequestsTable({
  rows,
  showActions,
}: {
  rows: AccessRequestRow[];
  showActions: boolean;
}) {
  if (rows.length === 0) {
    return <p className="py-8 text-sm text-fog">Nothing here.</p>;
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Email</TableHead>
          <TableHead>Requested</TableHead>
          <TableHead>Status</TableHead>
          {showActions ? <TableHead className="text-right">Actions</TableHead> : null}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.email}>
            <TableCell>{row.email}</TableCell>
            <TableCell>{row.requestedAt.toLocaleDateString()}</TableCell>
            <TableCell>
              <Badge variant={row.status === "approved" ? "default" : "secondary"}>
                {row.status}
              </Badge>
            </TableCell>
            {showActions ? (
              <TableCell className="flex justify-end gap-2">
                <form action={approveAccessRequestAction}>
                  <input type="hidden" name="email" value={row.email} />
                  <Button size="sm" type="submit">
                    Approve
                  </Button>
                </form>
                <form action={rejectAccessRequestAction}>
                  <input type="hidden" name="email" value={row.email} />
                  <Button size="sm" variant="outline" type="submit">
                    Reject
                  </Button>
                </form>
              </TableCell>
            ) : null}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
