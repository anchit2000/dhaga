// Dhaga Cloud only — see packages/ee/LICENSE.
import Link from "next/link";
import { listUsers } from "@dhaga/ee/admin";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function AdminUsersPage() {
  const users = await listUsers();

  return (
    <div>
      <h1 className="font-display text-2xl tracking-tight">Users</h1>
      <Table className="mt-6">
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Joined</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell>
                <Link href={`/app/admin/users/${user.id}`} className="hover:text-amber">
                  {user.name}
                </Link>
              </TableCell>
              <TableCell>{user.email}</TableCell>
              <TableCell>{user.createdAt.toLocaleDateString()}</TableCell>
              <TableCell>{user.isAdmin ? <Badge>admin</Badge> : null}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
