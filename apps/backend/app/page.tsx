import { redirect } from "next/navigation";
import { getCurrentUser } from "@k8event/shared/auth/get-user";

export const dynamic = "force-dynamic";

export default async function RootPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role === "agent") redirect("/admin/chat");
  redirect("/admin");
}
