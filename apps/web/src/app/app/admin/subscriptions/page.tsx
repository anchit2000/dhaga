// Dhaga Cloud only — see packages/ee/LICENSE.
import Link from "next/link";
import { listSubscriptions } from "@dhaga/ee/admin";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function AdminSubscriptionsPage() {
  const subscriptions = await listSubscriptions();

  return (
    <div>
      <h1 className="font-display text-2xl tracking-tight">Subscriptions</h1>
      {subscriptions.length === 0 ? (
        <p className="mt-6 text-sm text-fog">No subscriptions yet.</p>
      ) : (
        <Table className="mt-6">
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Renews</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {subscriptions.map((sub) => (
              <TableRow key={sub.id}>
                <TableCell>
                  <Link href={`/app/admin/users/${sub.userId}`} className="hover:text-amber">
                    {sub.userId}
                  </Link>
                </TableCell>
                <TableCell>
                  <Badge>{sub.plan}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={sub.status === "active" ? "default" : "secondary"}>
                    {sub.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  {sub.currentPeriodEnd ? sub.currentPeriodEnd.toLocaleDateString() : "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
