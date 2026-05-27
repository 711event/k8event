"use server";

import { createSupabaseServerClient } from "@k8event/shared/supabase/server";

export async function changePasswordAction(
  newPassword: string,
): Promise<{ error?: string }> {
  if (newPassword.length < 8) return { error: "密码至少 8 位" };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) return { error: error.message };
  return {};
}
