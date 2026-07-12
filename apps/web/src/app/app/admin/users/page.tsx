// Dhaga Cloud only — see packages/ee/LICENSE.
import { listUsers } from "@dhaga/ee/admin";
import { UsersTable } from "@/components/app/table/AdminTables";

export default async function AdminUsersPage() {
  const users = await listUsers();
  return <div className="space-y-6"><h1 className="font-display text-2xl tracking-tight">Users</h1><UsersTable users={users} /></div>;
}
