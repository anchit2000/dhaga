// Dhaga Cloud only — see packages/ee/LICENSE.
import { listSubscriptions } from "@dhaga/ee/admin";
import { SubscriptionsTable } from "@/components/app/table/AdminTables";

export default async function AdminSubscriptionsPage() {
  const subscriptions = await listSubscriptions();
  return <div className="space-y-6"><h1 className="font-display text-2xl tracking-tight">Subscriptions</h1><SubscriptionsTable subscriptions={subscriptions} /></div>;
}
