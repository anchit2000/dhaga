// Dhaga Cloud only — see packages/ee/LICENSE.
import { listAccessRequests } from "@dhaga/ee/access-requests";
import type { AccessRequestRow, AccessRequestStatus } from "@dhaga/ee/access-requests";
import { RequestsTable } from "@/components/app/table/AdminTables";
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
