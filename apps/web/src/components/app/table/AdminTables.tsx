"use client";

import Link from "next/link";
import type { AccessRequestRow } from "@dhaga/ee/access-requests";
import { DataTable, type DataTableColumn } from "@/components/app/table/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ActionForm } from "@/components/app/ActionForm";
import { approveAccessRequestAction, rejectAccessRequestAction } from "@/lib/actions/admin/access-requests";
import { endAiCreditGrantAction } from "@/lib/actions/admin/ai-budget";
import { ACCESS_REQUEST_STATUS_OPTIONS, SUBSCRIPTION_PLAN_OPTIONS, SUBSCRIPTION_STATUS_OPTIONS, USER_ROLE_OPTIONS } from "@/utils/constants/table";
import { formatDate } from "@/utils/format-date";

interface UserRow { id: string; name: string; email: string; isAdmin: boolean; createdAt: Date; }
interface SubscriptionRow { id: string; userId: string; userName: string | null; userEmail: string | null; plan: string; status: string; currentPeriodEnd: Date | null; }
interface GrantRow { id: string; userId: string | null; userName: string | null; userEmail: string | null; credits: number; reason: string; createdAt: Date; endsAt: Date | null; active: boolean; }

const USER_COLUMNS: DataTableColumn<UserRow>[] = [
  { id: "name", label: "Name", value: (row) => row.name, render: (row) => <Link href={`/app/admin/users/${row.id}`} className="hover:text-ember">{row.name || <span className="text-fog">{row.email}</span>}</Link> },
  { id: "email", label: "Email", value: (row) => row.email },
  { id: "joined", label: "Joined", value: (row) => formatDate(row.createdAt) },
  { id: "role", label: "Role", value: (row) => row.isAdmin ? "admin" : "user", options: USER_ROLE_OPTIONS, render: (row) => row.isAdmin ? <Badge>admin</Badge> : "user" },
];

const SUBSCRIPTION_COLUMNS: DataTableColumn<SubscriptionRow>[] = [
  { id: "user", label: "User", value: (row) => row.userId, render: (row) => <Link href={`/app/admin/users/${row.userId}`} className="hover:text-ember">{row.userName || <span className="text-fog">{row.userEmail}</span>}</Link> },
  { id: "plan", label: "Plan", value: (row) => row.plan, options: SUBSCRIPTION_PLAN_OPTIONS, render: (row) => <Badge>{row.plan}</Badge> },
  { id: "status", label: "Status", value: (row) => row.status, options: SUBSCRIPTION_STATUS_OPTIONS, render: (row) => <Badge variant={row.status === "active" ? "default" : "secondary"}>{row.status}</Badge> },
  { id: "renews", label: "Renews", value: (row) => row.currentPeriodEnd ? formatDate(row.currentPeriodEnd) : "", render: (row) => row.currentPeriodEnd ? formatDate(row.currentPeriodEnd) : "—" },
];

const GRANT_COLUMNS: DataTableColumn<GrantRow>[] = [
  { id: "search", label: "Recipient", value: (row) => row.userName ?? row.userEmail ?? "everyone", render: (row) => row.userId ? <Link href={`/app/admin/users/${row.userId}`} className="hover:text-ember">{row.userName || <span className="text-fog">{row.userEmail}</span>}</Link> : <Badge variant="secondary">everyone</Badge> },
  { id: "credits", label: "Credits", filter: false, value: (row) => `+${row.credits}`, className: "font-display tabular-nums" },
  { id: "reason", label: "Reason", filter: false, value: (row) => row.reason },
  { id: "created", label: "Created", filter: false, value: (row) => formatDate(row.createdAt) },
  { id: "expires", label: "Expires", filter: false, value: (row) => row.endsAt ? formatDate(row.endsAt) : "no expiry" },
  { id: "active", label: "Active", filter: false, value: (row) => row.active ? "active" : "ended", render: (row) => row.active ? <Badge>active</Badge> : <Badge variant="secondary">ended</Badge> },
  { id: "actions", label: "Actions", filter: false, value: () => "", className: "text-right", render: (row) => row.active ? <ActionForm action={endAiCreditGrantAction} errorMessage="Couldn't end the grant."><input type="hidden" name="grantId" value={row.id} />{row.userId ? <input type="hidden" name="userId" value={row.userId} /> : null}<Button type="submit" variant="outline" size="sm">End now</Button></ActionForm> : null },
];

export function UsersTable({ users, total, page, pageSize, filters }: { users: UserRow[]; total: number; page: number; pageSize: number; filters: Record<string, string> }) {
  return <DataTable key={`${page}:${pageSize}:${JSON.stringify(filters)}`} rows={users} columns={USER_COLUMNS} rowKey={(row) => row.id} initialFilters={filters} server={{ total, page, pageSize }} />;
}

export function SubscriptionsTable({ subscriptions, total, page, pageSize, filters }: { subscriptions: SubscriptionRow[]; total: number; page: number; pageSize: number; filters: Record<string, string> }) {
  return <DataTable key={`${page}:${pageSize}:${JSON.stringify(filters)}`} rows={subscriptions} columns={SUBSCRIPTION_COLUMNS} rowKey={(row) => row.id} initialFilters={filters} server={{ total, page, pageSize }} />;
}

export function GrantsTable({ grants, total, page, pageSize, filters }: { grants: GrantRow[]; total: number; page: number; pageSize: number; filters: Record<string, string> }) {
  return <DataTable key={`${page}:${pageSize}:${JSON.stringify(filters)}`} rows={grants} columns={GRANT_COLUMNS} rowKey={(row) => row.id} initialFilters={filters} server={{ total, page, pageSize }} />;
}

export function RequestsTable({ rows, total, page, pageSize, filters }: { rows: AccessRequestRow[]; total: number; page: number; pageSize: number; filters: Record<string, string> }) {
  const columns: DataTableColumn<AccessRequestRow>[] = [
    { id: "email", label: "Email", value: (row) => row.email },
    { id: "requested", label: "Requested", value: (row) => formatDate(row.requestedAt) },
    { id: "status", label: "Status", value: (row) => row.status, options: ACCESS_REQUEST_STATUS_OPTIONS, render: (row) => <Badge variant={row.status === "approved" ? "default" : "secondary"}>{row.status}</Badge> },
    { id: "actions", label: "Actions", filter: false, value: () => "", className: "text-right", render: (row) => row.status !== "approved" ? <div className="flex justify-end gap-2"><ActionForm action={approveAccessRequestAction} errorMessage="Couldn't approve the request."><input type="hidden" name="email" value={row.email} /><Button size="sm" type="submit">{row.status === "rejected" ? "Reverse and approve" : "Approve"}</Button></ActionForm>{row.status === "pending" ? <ActionForm action={rejectAccessRequestAction} errorMessage="Couldn't reject the request."><input type="hidden" name="email" value={row.email} /><Button size="sm" variant="outline" type="submit">Reject</Button></ActionForm> : null}</div> : null },
  ];
  return <DataTable key={`${page}:${pageSize}:${JSON.stringify(filters)}`} rows={rows} columns={columns} rowKey={(row) => row.email} emptyMessage="Nothing here." initialFilters={filters} server={{ total, page, pageSize }} />;
}
