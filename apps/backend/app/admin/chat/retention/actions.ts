"use server";

import { requireRole } from "@k8event/shared/auth/require-role";
import { createSupabaseServerClient } from "@k8event/shared/supabase/server";
import { getCurrentUser } from "@k8event/shared/auth/get-user";
import { revalidatePath } from "next/cache";
import { getGroupId } from "@/lib/get-group";

export interface RetentionFormData {
  message_retention_days: number;
  media_retention_days: number;
  archive_closed_threads_after_days: number;
  warn_after_minutes: number;
  critical_after_minutes: number;
}

export async function updateRetentionSettingsAction(data: RetentionFormData) {
  await requireRole("admin");
  const user = await getCurrentUser();
  const supabase = await createSupabaseServerClient();

  // Scope to this group's row (one row per group, seeded by migration)
  const groupId = getGroupId();
  const { data: existing } = await supabase
    .from("chat_retention_settings")
    .select("id")
    .eq("group_id", groupId)
    .maybeSingle();

  const payload = {
    message_retention_days: data.message_retention_days,
    media_retention_days: data.media_retention_days,
    archive_closed_threads_after_days: data.archive_closed_threads_after_days,
    warn_after_minutes: data.warn_after_minutes,
    critical_after_minutes: data.critical_after_minutes,
    updated_by: user?.id ?? null,
    updated_at: new Date().toISOString(),
  };

  if (existing) {
    const { error } = await supabase
      .from("chat_retention_settings")
      .update(payload)
      .eq("id", existing.id)
      .eq("group_id", groupId);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase
      .from("chat_retention_settings")
      .insert({ ...payload, group_id: groupId });
    if (error) return { error: error.message };
  }

  revalidatePath("/admin/chat/retention");
  revalidatePath("/admin/chat");
  return { ok: true };
}
