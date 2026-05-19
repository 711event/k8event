import { createSupabaseServerClient } from "../supabase/server";
import type { UserRole } from "../supabase/types";

export type AuthedUser = {
  id: string;
  email: string | null;
  role: UserRole;
  username: string | null;
  displayName: string;
};

export async function getCurrentUser(): Promise<AuthedUser | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, username, display_name")
    .eq("user_id", user.id)
    .single();

  if (!profile) return null;

  return {
    id: user.id,
    email: user.email ?? null,
    role: profile.role as UserRole,
    username: profile.username,
    displayName: profile.display_name,
  };
}
