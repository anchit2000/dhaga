import { redirect } from "next/navigation";
import { requireUserIdForPage } from "@/lib/auth/guard";

export default async function ImportPage() {
  await requireUserIdForPage();
  redirect("/app/settings#import");
}
