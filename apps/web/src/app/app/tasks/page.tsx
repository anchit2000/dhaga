import { TaskBoard } from "@/components/app/tasks/TaskBoard";
import { requireUserIdForPage } from "@/lib/auth/guard";
import { listTasks } from "@/lib/repo/tasks";

export const metadata = { title: "Tasks — Dhaga" };

export default async function TasksPage(): Promise<React.ReactElement> {
  await requireUserIdForPage();
  const tasks = await listTasks();
  return <TaskBoard items={tasks} />;
}
