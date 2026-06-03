"use server";

import { createSupabaseServerClient } from "@k8event/shared/supabase/server";
import { requireRole } from "@k8event/shared/auth/require-role";

export async function changePasswordAction(
  newPassword: string,
): Promise<{ error?: string }> {
  // Only authenticated players may change their own password via this action.
  // Guards against non-player sessions reaching this server action.
  await requireRole("player");
  if (newPassword.length < 8) return { error: "密码至少 8 位" };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) return { error: error.message };
  return {};
}
