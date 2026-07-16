"use client";

import Link from "next/link";
import type { AccessRequestRow } from "@dhaga/ee/access-requests";
import { DataTable, type DataTableColumn } from "@/components/app/table/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { approveAccessRequestAction, rejectAccessRequestAction } from "@/lib/actions/admin/access-requests";
import { ACCESS_REQUEST_STATUS_OPTIONS, SUBSCRIPTION_PLAN_OPTIONS, SUBSCRIPTION_STATUS_OPTIONS, USER_ROLE_OPTIONS } from "@/utils/constants/table";
import { formatDate } from "@/utils/format-date";

interface UserRow { id: string; name: string; email: string; isAdmin: boolean; createdAt: Date; }
interface SubscriptionRow { id: string; userId: string; plan: string; status: string; currentPeriodEnd: Date | null; }

const USER_COLUMNS: DataTableColumn<UserRow>[] = [
  { id: "name", label: "Name", value: (row) => row.name, render: (row) => <Link href={`/app/admin/users/${row.id}`} className="hover:text-ember">{row.name}</Link> },
  { id: "email", label: "Email", value: (row) => row.email },
  { id: "joined", label: "Joined", value: (row) => formatDate(row.createdAt) },
  { id: "role", label: "Role", value: (row) => row.isAdmin ? "admin" : "user", options: USER_ROLE_OPTIONS, render: (row) => row.isAdmin ? <Badge>admin</Badge> : "user" },
];

const SUBSCRIPTION_COLUMNS: DataTableColumn<SubscriptionRow>[] = [
  { id: "user", label: "User", value: (row) => row.userId, render: (row) => <Link href={`/app/admin/users/${row.userId}`} className="hover:text-ember">{row.userId}</Link> },
  { id: "plan", label: "Plan", value: (row) => row.plan, options: SUBSCRIPTION_PLAN_OPTIONS, render: (row) => <Badge>{row.plan}</Badge> },
  { id: "status", label: "Status", value: (row) => row.status, options: SUBSCRIPTION_STATUS_OPTIONS, render: (row) => <Badge variant={row.status === "active" ? "default" : "secondary"}>{row.status}</Badge> },
  { id: "renews", label: "Renews", value: (row) => row.currentPeriodEnd ? formatDate(row.currentPeriodEnd) : "", render: (row) => row.currentPeriodEnd ? formatDate(row.currentPeriodEnd) : "—" },
];

export function UsersTable({ users, total, page, pageSize, filters }: { users: UserRow[]; total: number; page: number; pageSize: number; filters: Record<string, string> }) {
  return <DataTable key={`${page}:${pageSize}:${JSON.stringify(filters)}`} rows={users} columns={USER_COLUMNS} rowKey={(row) => row.id} initialFilters={filters} server={{ total, page, pageSize }} />;
}

export function SubscriptionsTable({ subscriptions, total, page, pageSize, filters }: { subscriptions: SubscriptionRow[]; total: number; page: number; pageSize: number; filters: Record<string, string> }) {
  return <DataTable key={`${page}:${pageSize}:${JSON.stringify(filters)}`} rows={subscriptions} columns={SUBSCRIPTION_COLUMNS} rowKey={(row) => row.id} initialFilters={filters} server={{ total, page, pageSize }} />;
}

export function RequestsTable({ rows, total, page, pageSize, filters }: { rows: AccessRequestRow[]; total: number; page: number; pageSize: number; filters: Record<string, string> }) {
  const columns: DataTableColumn<AccessRequestRow>[] = [
    { id: "email", label: "Email", value: (row) => row.email },
    { id: "requested", label: "Requested", value: (row) => formatDate(row.requestedAt) },
    { id: "status", label: "Status", value: (row) => row.status, options: ACCESS_REQUEST_STATUS_OPTIONS, render: (row) => <Badge variant={row.status === "approved" ? "default" : "secondary"}>{row.status}</Badge> },
    { id: "actions", label: "Actions", filter: false, value: () => "", className: "text-right", render: (row) => row.status !== "approved" ? <div className="flex justify-end gap-2"><form action={approveAccessRequestAction}><input type="hidden" name="email" value={row.email} /><Button size="sm" type="submit">{row.status === "rejected" ? "Reverse and approve" : "Approve"}</Button></form>{row.status === "pending" ? <form action={rejectAccessRequestAction}><input type="hidden" name="email" value={row.email} /><Button size="sm" variant="outline" type="submit">Reject</Button></form> : null}</div> : null },
  ];
  return <DataTable key={`${page}:${pageSize}:${JSON.stringify(filters)}`} rows={rows} columns={columns} rowKey={(row) => row.email} emptyMessage="Nothing here." initialFilters={filters} server={{ total, page, pageSize }} />;
}
