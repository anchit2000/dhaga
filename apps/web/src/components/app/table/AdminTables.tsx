"use client";

import Link from "next/link";
import type { AccessRequestRow } from "@dhaga/ee/access-requests";
import { DataTable, type DataTableColumn } from "@/components/app/table/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { approveAccessRequestAction, rejectAccessRequestAction } from "@/lib/actions/admin/access-requests";

interface UserRow { id: string; name: string; email: string; isAdmin: boolean; createdAt: Date; }
interface SubscriptionRow { id: string; userId: string; plan: string; status: string; currentPeriodEnd: Date | null; }

const USER_COLUMNS: DataTableColumn<UserRow>[] = [
  { id: "name", label: "Name", value: (row) => row.name, render: (row) => <Link href={`/app/admin/users/${row.id}`} className="hover:text-amber">{row.name}</Link> },
  { id: "email", label: "Email", value: (row) => row.email },
  { id: "joined", label: "Joined", value: (row) => row.createdAt.toLocaleDateString() },
  { id: "role", label: "Role", value: (row) => row.isAdmin ? "admin" : "user", render: (row) => row.isAdmin ? <Badge>admin</Badge> : "user" },
];

const SUBSCRIPTION_COLUMNS: DataTableColumn<SubscriptionRow>[] = [
  { id: "user", label: "User", value: (row) => row.userId, render: (row) => <Link href={`/app/admin/users/${row.userId}`} className="hover:text-amber">{row.userId}</Link> },
  { id: "plan", label: "Plan", value: (row) => row.plan, render: (row) => <Badge>{row.plan}</Badge> },
  { id: "status", label: "Status", value: (row) => row.status, render: (row) => <Badge variant={row.status === "active" ? "default" : "secondary"}>{row.status}</Badge> },
  { id: "renews", label: "Renews", value: (row) => row.currentPeriodEnd?.toLocaleDateString() ?? "", render: (row) => row.currentPeriodEnd?.toLocaleDateString() ?? "—" },
];

export function UsersTable({ users }: { users: UserRow[] }) {
  return <DataTable rows={users} columns={USER_COLUMNS} rowKey={(row) => row.id} />;
}

export function SubscriptionsTable({ subscriptions }: { subscriptions: SubscriptionRow[] }) {
  return <DataTable rows={subscriptions} columns={SUBSCRIPTION_COLUMNS} rowKey={(row) => row.id} />;
}

export function RequestsTable({ rows, showActions }: { rows: AccessRequestRow[]; showActions: boolean }) {
  const columns: DataTableColumn<AccessRequestRow>[] = [
    { id: "email", label: "Email", value: (row) => row.email },
    { id: "requested", label: "Requested", value: (row) => row.requestedAt.toLocaleDateString() },
    { id: "status", label: "Status", value: (row) => row.status, render: (row) => <Badge variant={row.status === "approved" ? "default" : "secondary"}>{row.status}</Badge> },
    ...(showActions ? [{ id: "actions", label: "Actions", filter: false, value: () => "", className: "text-right", render: (row: AccessRequestRow) => <div className="flex justify-end gap-2"><form action={approveAccessRequestAction}><input type="hidden" name="email" value={row.email} /><Button size="sm" type="submit">Approve</Button></form><form action={rejectAccessRequestAction}><input type="hidden" name="email" value={row.email} /><Button size="sm" variant="outline" type="submit">Reject</Button></form></div> }] : []),
  ];
  return <DataTable rows={rows} columns={columns} rowKey={(row) => row.email} emptyMessage="Nothing here." />;
}
