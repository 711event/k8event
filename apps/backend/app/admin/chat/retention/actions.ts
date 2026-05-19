"use server";

import { requireRole } from "@k8event/shared/auth/require-role";
import { createSupabaseServerClient } from "@k8event/shared/supabase/server";
import { getCurrentUser } from "@k8event/shared/auth/get-user";
import { revalidatePath } from "next/cache";

export interface RetentionFormData {
  message_retention_days: number;
  media_retention_days: number;
  archive_closed_threads_after_days: number;
}

export async function updateRetentionSettingsAction(data: RetentionFormData) {
  await requireRole("admin");
  const user = await getCurrentUser();
  const supabase = await createSupabaseServerClient();

  // Always upsert the single row (there is always exactly one row seeded)
  const { data: existing } = await supabase
    .from("chat_retention_settings")
    .select("id")
    .limit(1)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("chat_retention_settings")
      .update({
        message_retention_days: data.message_retention_days,
        media_retention_days: data.media_retention_days,
        archive_closed_threads_after_days: data.archive_closed_threads_after_days,
        updated_by: user?.id ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("chat_retention_settings").insert({
      message_retention_days: data.message_retention_days,
      media_retention_days: data.media_retention_days,
      archive_closed_threads_after_days: data.archive_closed_threads_after_days,
      updated_by: user?.id ?? null,
    });
    if (error) return { error: error.message };
  }

  revalidatePath("/admin/chat/retention");
  return { ok: true };
}
