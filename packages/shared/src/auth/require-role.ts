import { redirect } from "next/navigation";
import { getCurrentUser, type AuthedUser } from "./get-user";
import type { UserRole } from "../supabase/types";

export async function requireRole(allowed: UserRole | UserRole[]): Promise<AuthedUser> {
  const user = await getCurrentUser();
  const allowedList = Array.isArray(allowed) ? allowed : [allowed];
  if (!user) redirect("/login");
  if (!allowedList.includes(user.role)) redirect("/login");
  return user;
}
